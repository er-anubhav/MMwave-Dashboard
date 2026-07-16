import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../providers/device_provider.dart';
import '../widgets/activity_chart.dart';
import '../widgets/glass_card.dart';
import '../widgets/stat_card.dart';
import '../widgets/dashboard_header.dart';

class SecurityActivityTab extends StatefulWidget {
  const SecurityActivityTab({Key? key}) : super(key: key);

  @override
  State<SecurityActivityTab> createState() => _SecurityActivityTabState();
}

class _SecurityActivityTabState extends State<SecurityActivityTab> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      Provider.of<DeviceProvider>(context, listen: false).loadSystemLogs();
    });
  }

  String _formatLogDate(String? dateStr) {
    if (dateStr == null) return '';
    try {
      final parsed = DateTime.parse(dateStr.replaceFirst(' ', 'T'));
      return DateFormat('HH:mm:ss').format(parsed);
    } catch (_) {
      return dateStr;
    }
  }

  Color _getLogColor(String logType) {
    switch (logType.toLowerCase()) {
      case 'notification':
        return Colors.purpleAccent;
      case 'automation':
        return Colors.orangeAccent;
      case 'mode':
      case 'action':
        return const Color(0xFFA7DEC5);
      default:
        return const Color(0xFF9CAAA2);
    }
  }

  @override
  Widget build(BuildContext context) {
    final deviceProvider = Provider.of<DeviceProvider>(context);
    final telemetry = deviceProvider.telemetry;
    final selectedDevice = deviceProvider.selectedDevice;
    final systemLogs = deviceProvider.systemLogs;

    if (selectedDevice == null) {
      return const Center(
        child: Text(
          'Select a device to view security tracking',
          style: TextStyle(color: Color(0xFF9CAAA2)),
        ),
      );
    }

    final sensorData = telemetry?.sensorData;
    final presence = sensorData?.presence ?? false;
    final activity = sensorData?.activity ?? 0;
    final fallDetected = sensorData?.fallDetected ?? false;

    return FutureBuilder<List<Map<String, dynamic>>>(
      future: deviceProvider.fetchTelemetryHistory(30),
      builder: (context, snapshot) {
        final history = snapshot.data ?? [];
        return SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 12.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const DashboardHeader(),
              // Fall detection alarm panel
              Container(
                margin: const EdgeInsets.only(bottom: 16.0),
                padding: const EdgeInsets.all(16.0),
                decoration: BoxDecoration(
                  color: fallDetected ? Colors.red.withOpacity(0.15) : const Color(0xFF13261C).withOpacity(0.4),
                  borderRadius: BorderRadius.zero, // Zero border-radius
                  border: Border.all(
                    color: fallDetected ? Colors.redAccent : const Color(0xFF1F3B2D),
                    width: 1.5,
                  ),
                ),
                child: Row(
                  children: [
                    Icon(
                      fallDetected ? Icons.warning_rounded : Icons.gpp_good_rounded,
                      color: fallDetected ? Colors.redAccent : const Color(0xFFA7DEC5),
                      size: 32,
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            fallDetected ? 'FALL DETECTED!' : 'Status Normal',
                            style: TextStyle(
                              color: fallDetected ? Colors.redAccent : const Color(0xFFA7DEC5),
                              fontSize: 16,
                              fontWeight: FontWeight.normal,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            fallDetected
                                ? 'An immediate fall has been flagged on the MMWave sensor.'
                                : 'Fall detection algorithm active and monitoring room space.',
                            style: const TextStyle(
                              color: Color(0xFF9CAAA2),
                              fontSize: 12,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),

              // Activity stats cards
              Row(
                children: [
                  Expanded(
                    child: StatCard(
                      title: 'ROOM OCCUPANCY',
                      value: presence ? 'Occupied' : 'Vacant',
                      icon: presence ? Icons.home : Icons.home_outlined,
                      color: presence ? const Color(0xFFA7DEC5) : const Color(0xFF9CAAA2),
                      subtitle: presence ? 'Occupant present' : 'No motion detected',
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: StatCard(
                      title: 'ACTIVITY INDEX',
                      value: '$activity',
                      unit: '',
                      icon: Icons.bubble_chart,
                      color: Colors.orangeAccent,
                      subtitle: 'Current occupant activity',
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),

              // Activity graph
              ActivityChart(history: history),
              const SizedBox(height: 16),

              // System Logs Table
              GlassCard(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          'Recent Security Events',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 15,
                            fontWeight: FontWeight.normal,
                          ),
                        ),
                        IconButton(
                          icon: const Icon(Icons.refresh, color: Color(0xFFA7DEC5), size: 20),
                          onPressed: () => deviceProvider.loadSystemLogs(),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    if (systemLogs.isEmpty)
                      const Padding(
                        padding: EdgeInsets.symmetric(vertical: 20.0),
                        child: Center(
                          child: Text(
                            'No recent event logs.',
                            style: TextStyle(color: Color(0xFF9CAAA2), fontSize: 13),
                          ),
                        ),
                      )
                    else
                      ListView.separated(
                        shrinkWrap: true,
                        physics: const NeverScrollableScrollPhysics(),
                        itemCount: systemLogs.length > 5 ? 5 : systemLogs.length,
                        separatorBuilder: (context, index) => const Divider(color: Color(0xFF1F3B2D), height: 1),
                        itemBuilder: (context, index) {
                          final log = systemLogs[index];
                          final typeColor = _getLogColor(log.logType);
                          return Padding(
                            padding: const EdgeInsets.symmetric(vertical: 8.0),
                            child: Row(
                              children: [
                                Container(
                                  width: 6,
                                  height: 24,
                                  decoration: BoxDecoration(
                                    color: typeColor,
                                    borderRadius: BorderRadius.zero,
                                  ),
                                ),
                                const SizedBox(width: 10),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        log.event,
                                        style: const TextStyle(
                                          color: Colors.white,
                                          fontSize: 13,
                                          fontWeight: FontWeight.w600,
                                        ),
                                      ),
                                      const SizedBox(height: 2),
                                      Text(
                                        log.logType.toUpperCase(),
                                        style: TextStyle(
                                          color: typeColor.withOpacity(0.8),
                                          fontSize: 9,
                                          fontWeight: FontWeight.normal,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                                Column(
                                  crossAxisAlignment: CrossAxisAlignment.end,
                                  children: [
                                    Text(
                                      _formatLogDate(log.createdAt),
                                      style: GoogleFonts.jetBrainsMono(
                                        color: const Color(0xFF9CAAA2),
                                        fontSize: 11,
                                      ),
                                    ),
                                    const SizedBox(height: 2),
                                    Text(
                                      log.status.toUpperCase(),
                                      style: TextStyle(
                                        color: log.status.toLowerCase() == 'success'
                                            ? const Color(0xFFA7DEC5)
                                            : Colors.orangeAccent,
                                        fontSize: 10,
                                        fontWeight: FontWeight.normal,
                                      ),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          );
                        },
                      ),
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}
