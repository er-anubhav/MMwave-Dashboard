import 'package:flutter/material.dart';
import 'package:fl_chart/fl_chart.dart';
import 'glass_card.dart';

class ActivityChart extends StatelessWidget {
  final List<Map<String, dynamic>> history;
  final bool isPreview;

  const ActivityChart({
    Key? key,
    required this.history,
    this.isPreview = false,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    List<FlSpot> spots = [];

    // Order history from oldest to newest
    final reversedHistory = history.reversed.toList();

    for (int i = 0; i < reversedHistory.length; i++) {
      final item = reversedHistory[i];
      final sensorData = item['sensor_data'] ?? {};
      final double x = i.toDouble();
      
      if (sensorData['activity'] != null) {
        spots.add(FlSpot(x, (sensorData['activity'] as num).toDouble()));
      }
    }

    // Default spots if empty
    if (spots.isEmpty) {
      spots = const [FlSpot(0, 10), FlSpot(1, 20), FlSpot(2, 5), FlSpot(3, 45), FlSpot(4, 15), FlSpot(5, 30)];
    }

    final lineChart = LineChart(
      LineChartData(
        gridData: FlGridData(
          show: !isPreview,
          drawVerticalLine: false,
          getDrawingHorizontalLine: (value) {
            return const FlLine(
              color: Color(0xFF334155),
              strokeWidth: 1,
            );
          },
        ),
        titlesData: FlTitlesData(
          show: !isPreview,
          rightTitles: const AxisTitles(
            sideTitles: SideTitles(showTitles: false),
          ),
          topTitles: const AxisTitles(
            sideTitles: SideTitles(showTitles: false),
          ),
          leftTitles: AxisTitles(
            sideTitles: SideTitles(
              showTitles: true,
              reservedSize: 32,
              getTitlesWidget: (value, meta) {
                return Text(
                  value.toInt().toString(),
                  style: const TextStyle(
                    color: Color(0xFF64748B),
                    fontWeight: FontWeight.normal,
                    fontSize: 10,
                  ),
                );
              },
            ),
          ),
          bottomTitles: const AxisTitles(
            sideTitles: SideTitles(showTitles: false),
          ),
        ),
        borderData: FlBorderData(
          show: false,
        ),
        lineBarsData: [
          LineChartBarData(
            spots: spots,
            isCurved: true,
            color: Colors.orangeAccent,
            barWidth: isPreview ? 2.5 : 3.5,
            isStrokeCapRound: true,
            dotData: const FlDotData(show: false),
            belowBarData: BarAreaData(
              show: true,
              color: Colors.orangeAccent.withOpacity(0.12),
            ),
          ),
        ],
        minY: 0,
        maxY: 100,
      ),
    );

    if (isPreview) {
      return SizedBox(
        height: 120,
        child: lineChart,
      );
    }

    return GlassCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Activity Index History',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 16,
                  fontWeight: FontWeight.normal,
                ),
              ),
              Row(
                children: [
                  Container(
                    width: 8,
                    height: 8,
                    decoration: const BoxDecoration(
                      color: Colors.orangeAccent,
                      shape: BoxShape.circle,
                    ),
                  ),
                  const SizedBox(width: 4),
                  const Text(
                    'Activity Level',
                    style: TextStyle(
                      color: Color(0xFF94A3B8),
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 20),
          SizedBox(
            height: 200,
            child: lineChart,
          ),
        ],
      ),
    );
  }
}
