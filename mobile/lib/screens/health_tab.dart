import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../providers/device_provider.dart';
import '../widgets/vitals_chart.dart';
import '../widgets/glass_card.dart';
import '../widgets/stat_card.dart';
import '../widgets/dashboard_header.dart';

class HealthSleepTab extends StatefulWidget {
  const HealthSleepTab({Key? key}) : super(key: key);

  @override
  State<HealthSleepTab> createState() => _HealthSleepTabState();
}

class _HealthSleepTabState extends State<HealthSleepTab> {
  @override
  Widget build(BuildContext context) {
    final deviceProvider = Provider.of<DeviceProvider>(context);
    final telemetry = deviceProvider.telemetry;
    final selectedDevice = deviceProvider.selectedDevice;

    if (selectedDevice == null) {
      return const Center(
        child: Text(
          'Select a device to view health telemetry',
          style: TextStyle(color: Color(0xFF9CAAA2)),
        ),
      );
    }

    final isStd = selectedDevice.deviceId.toUpperCase().startsWith('STD');
    if (isStd) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(
                Icons.favorite_border,
                size: 64,
                color: Colors.pinkAccent,
              ),
              const SizedBox(height: 16),
              const Text(
                'Vitals Tracking Disabled',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 20,
                  fontWeight: FontWeight.normal,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                '${selectedDevice.name} is a Standard (STD) device (determined by ID prefix). Vitals, heartbeat, and sleep tracking are only supported on Pro (PRO) devices.',
                textAlign: TextAlign.center,
                style: const TextStyle(
                  color: Color(0xFF9CAAA2),
                  fontSize: 14,
                ),
              ),
            ],
          ),
        ),
      );
    }

    final sensorData = telemetry?.sensorData;
    final sleep = sensorData?.sleep;

    final hasSleepData = sleep != null;
    final heartRate = sleep?.heartRate ?? 0;
    final respiration = sleep?.respiration ?? 0;
    final sleepState = sleep?.sleepState ?? 'Awake';
    final sleepScore = sleep?.score ?? 82; // Default mock score if null
    final movement = sleep?.movement ?? 0;

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
              // Heart rate & Respiration numbers
              Row(
                children: [
                  Expanded(
                    child: StatCard(
                      title: 'HEART RATE',
                      value: hasSleepData ? '$heartRate' : '--',
                      unit: 'bpm',
                      icon: Icons.favorite,
                      color: Colors.pinkAccent,
                      subtitle: hasSleepData ? 'Real-time heartbeat pulse' : 'Requires sleep mode tracking',
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: StatCard(
                      title: 'RESPIRATION',
                      value: hasSleepData ? '$respiration' : '--',
                      unit: 'rpm',
                      icon: Icons.air,
                      color: Colors.blueAccent,
                      subtitle: hasSleepData ? 'Real-time respiratory cycle' : 'Requires sleep mode tracking',
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),

              // Vitals Chart
              VitalsChart(history: history),
              const SizedBox(height: 16),

              // Sleep Quality Metrics Card
              GlassCard(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          'Sleep Quality Analysis',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 16,
                            fontWeight: FontWeight.normal,
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(
                            color: const Color(0xFF408A71).withOpacity(0.2),
                            borderRadius: BorderRadius.zero,
                            border: Border.all(color: const Color(0xFFA7DEC5), width: 1),
                          ),
                          child: Text(
                            sleepState.toUpperCase(),
                            style: const TextStyle(
                              color: Color(0xFFA7DEC5),
                              fontSize: 11,
                              fontWeight: FontWeight.normal,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 20),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceAround,
                      children: [
                        _buildSleepMetric('Sleep Score', '$sleepScore', '/100', Icons.star, Colors.amberAccent),
                        _buildSleepMetric('Sleep State', sleepState, '', Icons.hotel, const Color(0xFFA7DEC5)),
                        _buildSleepMetric('Movement', '$movement', ' index', Icons.directions_run, Colors.orangeAccent),
                      ],
                    ),
                    const SizedBox(height: 20),
                    const Divider(color: Color(0xFF1F3B2D)),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        const Icon(Icons.info_outline, color: Color(0xFFA7DEC5), size: 16),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            hasSleepData
                                ? 'MMWave radar sensors are currently tracking vital chest micro-movements. State is evaluated in real-time.'
                                : 'Switch your device radar mode to "Sleep" in order to activate full vitals polling and sleep cycle tracking.',
                            style: const TextStyle(
                              color: Color(0xFF9CAAA2),
                              fontSize: 12,
                              height: 1.4,
                            ),
                          ),
                        ),
                      ],
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

  Widget _buildSleepMetric(String label, String value, String unit, IconData icon, Color color) {
    return Column(
      children: [
        Icon(icon, color: color, size: 24),
        const SizedBox(height: 8),
        Text(
          label,
          style: const TextStyle(
            color: Color(0xFF9CAAA2),
            fontSize: 11,
            fontWeight: FontWeight.w600,
          ),
        ),
        const SizedBox(height: 4),
        Row(
          crossAxisAlignment: CrossAxisAlignment.baseline,
          textBaseline: TextBaseline.alphabetic,
          children: [
            Text(
              value,
              style: GoogleFonts.jetBrainsMono(
                color: Colors.white,
                fontSize: 16,
                fontWeight: FontWeight.normal,
              ),
            ),
            if (unit.isNotEmpty)
              Text(
                unit,
                style: const TextStyle(
                  color: Color(0xFF9CAAA2),
                  fontSize: 11,
                ),
              ),
          ],
        ),
      ],
    );
  }
}
