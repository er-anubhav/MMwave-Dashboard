import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../providers/device_provider.dart';
import '../widgets/stat_card.dart';
import '../widgets/relay_control.dart';
import '../widgets/activity_chart.dart';
import '../widgets/glass_card.dart';
import '../widgets/dashboard_header.dart';

class DashboardTab extends StatefulWidget {
  const DashboardTab({Key? key}) : super(key: key);

  @override
  State<DashboardTab> createState() => _DashboardTabState();
}

class _DashboardTabState extends State<DashboardTab> {
  bool _isRelayUpdating = false;

  String _formatUptime(int? seconds) {
    if (seconds == null) return 'N/A';
    final duration = Duration(seconds: seconds);
    final days = duration.inDays;
    final hours = duration.inHours % 24;
    final minutes = duration.inMinutes % 60;
    if (days > 0) {
      return '${days}d ${hours}h';
    }
    return '${hours}h ${minutes}m';
  }

  @override
  Widget build(BuildContext context) {
    final deviceProvider = Provider.of<DeviceProvider>(context);
    final selectedDevice = deviceProvider.selectedDevice;
    final telemetry = deviceProvider.telemetry;

    if (selectedDevice == null) {
      return const Center(
        child: CircularProgressIndicator(
          valueColor: AlwaysStoppedAnimation<Color>(Color(0xFFA7DEC5)),
        ),
      );
    }

    final sensorData = telemetry?.sensorData;
    final sleep = sensorData?.sleep;
    
    final presence = sensorData?.presence ?? false;
    final radarMode = telemetry?.mode ?? selectedDevice.desiredMode;
    final relayState = telemetry?.relay ?? selectedDevice.desiredRelay;
    final relayMode = telemetry?.relayMode ?? selectedDevice.relayMode;

    final isStd = selectedDevice.deviceId.toUpperCase().startsWith('STD');

    return SingleChildScrollView(
      padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 12.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const DashboardHeader(),
          // Row 1: Presence & Mode
          Row(
            children: [
              Expanded(
                child: StatCard(
                  title: 'PRESENCE',
                  value: presence ? 'Detected' : 'Empty',
                  icon: presence ? Icons.person : Icons.person_outline,
                  color: presence ? const Color(0xFFA7DEC5) : const Color(0xFF9CAAA2),
                  subtitle: presence ? 'Active room occupation' : 'No occupant detected',
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: InkWell(
                  onTap: isStd ? null : () {
                    // Quick switch mode
                    final nextMode = radarMode == 'fall' ? 'sleep' : 'fall';
                    deviceProvider.switchMode(nextMode);
                  },
                  borderRadius: BorderRadius.zero,
                  child: StatCard(
                    title: 'RADAR MODE',
                    value: isStd ? 'FALL' : radarMode.toUpperCase(),
                    icon: (radarMode == 'sleep' && !isStd) ? Icons.nightlight_round : Icons.warning_amber_rounded,
                    color: (radarMode == 'sleep' && !isStd) ? const Color(0xFF408A71) : Colors.orangeAccent,
                    subtitle: isStd ? 'Fixed presence monitoring' : 'Tap to switch mode',
                  ),
                ),
              ),
            ],
          ),
          
          if (!isStd) ...[
            const SizedBox(height: 12),
            // Row 2: Vitals preview
            Row(
              children: [
                Expanded(
                  child: StatCard(
                    title: 'HEART RATE',
                    value: sleep?.heartRate?.toString() ?? '--',
                    unit: 'bpm',
                    icon: Icons.favorite,
                    color: Colors.pinkAccent,
                    subtitle: sleep?.heartRate != null ? 'Live vitals polling' : 'Requires sleep mode',
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: StatCard(
                    title: 'RESPIRATION',
                    value: sleep?.respiration?.toString() ?? '--',
                    unit: 'rpm',
                    icon: Icons.air,
                    color: Colors.blueAccent,
                    subtitle: sleep?.respiration != null ? 'Vitals polling normal' : 'Requires sleep mode',
                  ),
                ),
              ],
            ),
          ],
          const SizedBox(height: 16),

          // Relay Control Widget
          RelayControl(
            relay: relayState,
            relayMode: relayMode,
            isLoading: _isRelayUpdating,
            onChanged: (state, mode) async {
              setState(() {
                _isRelayUpdating = true;
              });
              await deviceProvider.controlRelay(state, mode);
              if (mounted) {
                setState(() {
                  _isRelayUpdating = false;
                });
              }
            },
          ),
          const SizedBox(height: 16),

          // Live Logs / Network Health details
          GlassCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Radar Info & Health',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 15,
                    fontWeight: FontWeight.normal,
                  ),
                ),
                const SizedBox(height: 12),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    _buildInfoColumn('Uptime', _formatUptime(selectedDevice.uptimeSeconds)),
                    _buildInfoColumn('RSSI', selectedDevice.wifiRssi != null ? '${selectedDevice.wifiRssi} dBm' : 'N/A'),
                    _buildInfoColumn('Firmware', selectedDevice.firmwareVersion ?? 'v1.0'),
                    _buildInfoColumn('IP Address', selectedDevice.ipAddress ?? '192.168.1.50'),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // Recent Activity Preview Box
          FutureBuilder<List<Map<String, dynamic>>>(
            future: deviceProvider.fetchTelemetryHistory(15),
            builder: (context, snapshot) {
              final history = snapshot.data ?? [];
              return Column(
                children: [
                  // Activity Graph preview
                  GlassCard(
                    padding: const EdgeInsets.all(12),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Text(
                              'Activity Level Preview',
                              style: TextStyle(color: Colors.white, fontWeight: FontWeight.normal, fontSize: 13),
                            ),
                            const Icon(Icons.keyboard_arrow_right, color: Color(0xFFA7DEC5)),
                          ],
                        ),
                        const SizedBox(height: 12),
                        ActivityChart(history: history, isPreview: true),
                      ],
                    ),
                  ),
                ],
              );
            },
          ),
        ],
      ),
    );
  }

  Widget _buildInfoColumn(String label, String value) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(
            color: Color(0xFF9CAAA2),
            fontSize: 11,
            fontWeight: FontWeight.w600,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          value,
          style: GoogleFonts.jetBrainsMono(
            color: Colors.white,
            fontSize: 12,
            fontWeight: FontWeight.normal,
          ),
        ),
      ],
    );
  }
}
