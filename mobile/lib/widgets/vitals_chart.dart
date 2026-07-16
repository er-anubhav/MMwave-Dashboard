import 'package:flutter/material.dart';
import 'package:fl_chart/fl_chart.dart';
import 'glass_card.dart';

class VitalsChart extends StatelessWidget {
  final List<Map<String, dynamic>> history;
  final bool isPreview;

  const VitalsChart({
    Key? key,
    required this.history,
    this.isPreview = false,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    // Extract points
    List<FlSpot> heartRateSpots = [];
    List<FlSpot> respirationSpots = [];

    // Order history from oldest to newest for plotting
    final reversedHistory = history.reversed.toList();

    for (int i = 0; i < reversedHistory.length; i++) {
      final item = reversedHistory[i];
      final sensorData = item['sensor_data'] ?? {};
      final sleep = sensorData['sleep'] ?? {};
      
      final double x = i.toDouble();
      
      if (sleep['heart_rate'] != null) {
        heartRateSpots.add(FlSpot(x, (sleep['heart_rate'] as num).toDouble()));
      }
      if (sleep['respiration'] != null) {
        respirationSpots.add(FlSpot(x, (sleep['respiration'] as num).toDouble()));
      }
    }

    // Default spots if empty
    if (heartRateSpots.isEmpty) {
      heartRateSpots = const [FlSpot(0, 70), FlSpot(1, 72), FlSpot(2, 68), FlSpot(3, 75), FlSpot(4, 71)];
    }
    if (respirationSpots.isEmpty) {
      respirationSpots = const [FlSpot(0, 16), FlSpot(1, 15), FlSpot(2, 17), FlSpot(3, 16), FlSpot(4, 18)];
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
          // Heart Rate (Rose)
          LineChartBarData(
            spots: heartRateSpots,
            isCurved: true,
            color: const Color(0xFFFB7185),
            barWidth: isPreview ? 2.5 : 3.5,
            isStrokeCapRound: true,
            dotData: const FlDotData(show: false),
            belowBarData: BarAreaData(
              show: !isPreview,
              color: const Color(0xFFFB7185).withOpacity(0.08),
            ),
          ),
          // Respiration (Light Blue)
          LineChartBarData(
            spots: respirationSpots,
            isCurved: true,
            color: Colors.lightBlueAccent,
            barWidth: isPreview ? 2.0 : 3.0,
            isStrokeCapRound: true,
            dotData: const FlDotData(show: false),
            belowBarData: BarAreaData(
              show: !isPreview,
              color: Colors.lightBlueAccent.withOpacity(0.08),
            ),
          ),
        ],
        minY: 0,
        maxY: 120,
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
                'Live Vitals Monitor',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 16,
                  fontWeight: FontWeight.normal,
                ),
              ),
              Row(
                children: [
                  _buildLegendIndicator('Heart Rate', const Color(0xFFFB7185)),
                  const SizedBox(width: 12),
                  _buildLegendIndicator('Respiration', Colors.lightBlueAccent),
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

  Widget _buildLegendIndicator(String name, Color color) {
    return Row(
      children: [
        Container(
          width: 8,
          height: 8,
          decoration: BoxDecoration(
            color: color,
            shape: BoxShape.circle,
          ),
        ),
        const SizedBox(width: 4),
        Text(
          name,
          style: const TextStyle(
            color: Color(0xFF94A3B8),
            fontSize: 11,
            fontWeight: FontWeight.w600,
          ),
        ),
      ],
    );
  }
}
