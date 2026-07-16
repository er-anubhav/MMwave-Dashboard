import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../providers/device_provider.dart';
import '../widgets/glass_card.dart';
import '../widgets/dashboard_header.dart';
import 'device_manage_screen.dart';
import 'automations_screen.dart';
import 'notifications_screen.dart';
import 'raw_logs_screen.dart';

class SettingsTab extends StatefulWidget {
  const SettingsTab({Key? key}) : super(key: key);

  @override
  State<SettingsTab> createState() => _SettingsTabState();
}

class _SettingsTabState extends State<SettingsTab> {
  final _sensorLimitController = TextEditingController();
  final _logLimitController = TextEditingController();
  bool _isSavingRetention = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final deviceProvider = Provider.of<DeviceProvider>(context, listen: false);
      deviceProvider.loadDiagnosticsAndSettings().then((_) {
        _sensorLimitController.text = deviceProvider.retention['sensor_record_limit'].toString();
        _logLimitController.text = deviceProvider.retention['log_limit'].toString();
      });
    });
  }

  @override
  void dispose() {
    _sensorLimitController.dispose();
    _logLimitController.dispose();
    super.dispose();
  }

  void _saveRetention() async {
    final sensorLimit = int.tryParse(_sensorLimitController.text);
    final logLimit = int.tryParse(_logLimitController.text);

    if (sensorLimit == null || logLimit == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter valid integers')),
      );
      return;
    }

    setState(() {
      _isSavingRetention = true;
    });

    final deviceProvider = Provider.of<DeviceProvider>(context, listen: false);
    final success = await deviceProvider.updateRetentionSettings(sensorLimit, logLimit);

    if (mounted) {
      setState(() {
        _isSavingRetention = false;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            success ? 'Retention settings updated!' : 'Failed to update settings',
          ),
          backgroundColor: success ? Colors.green : Colors.red,
        ),
      );
    }
  }

  void _exportBackup(bool includeSecrets) async {
    final deviceProvider = Provider.of<DeviceProvider>(context, listen: false);
    final backup = await deviceProvider.exportBackup(includeSecrets);

    if (backup != null && mounted) {
      showDialog(
        context: context,
        builder: (context) {
          final prettyString = const JsonEncoder.withIndent('  ').convert(backup);
          return AlertDialog(
            backgroundColor: const Color(0xFF13261C),
            shape: const RoundedRectangleBorder(
              borderRadius: BorderRadius.zero,
            ),
            title: const Text('Export Successful', style: TextStyle(color: Colors.white)),
            content: SizedBox(
              width: double.maxFinite,
              height: 250,
              child: SingleChildScrollView(
                child: SelectionArea(
                  child: Text(
                    prettyString,
                    style: GoogleFonts.jetBrainsMono(
                      fontSize: 10,
                      color: const Color(0xFF9CAAA2),
                    ),
                  ),
                ),
              ),
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(context),
                child: const Text('Close', style: TextStyle(color: Color(0xFFA7DEC5))),
              ),
            ],
          );
        },
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final authProvider = Provider.of<AuthProvider>(context);
    final deviceProvider = Provider.of<DeviceProvider>(context);
    final user = authProvider.user ?? {};
    final stats = deviceProvider.diagnostics ?? {};

    return SingleChildScrollView(
      padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 12.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const DashboardHeader(),
          // Sub-menus launcher
          const Text(
            'Configuration Features',
            style: TextStyle(color: Color(0xFF9CAAA2), fontWeight: FontWeight.normal, fontSize: 13),
          ),
          const SizedBox(height: 8),

          GlassCard(
            borderColor: Colors.transparent,
            backgroundColor: const Color(0xFF13261C).withOpacity(0.3),
            padding: EdgeInsets.zero,
            child: Column(
              children: [
                _buildLauncherItem(
                  context,
                  'Device Management',
                  'Link, rename, rotate keys, and unlink MMWave devices.',
                  Icons.router,
                  const Color(0xFFA7DEC5),
                  const DeviceManagementScreen(),
                ),
                const Divider(color: Color(0xFF1F3B2D), height: 1, indent: 56, endIndent: 8),
                _buildLauncherItem(
                  context,
                  'Automations (Routines & Rules)',
                  'Configure daily timers and rule event triggers.',
                  Icons.insights,
                  Colors.orangeAccent,
                  const AutomationsScreen(),
                ),
                const Divider(color: Color(0xFF1F3B2D), height: 1, indent: 56, endIndent: 8),
                _buildLauncherItem(
                  context,
                  'Recent Notifications Activity',
                  'Inspect alert dispatch logs for Telegram/WhatsApp channels.',
                  Icons.notifications_active,
                  Colors.purpleAccent,
                  const NotificationsScreen(),
                ),
                const Divider(color: Color(0xFF1F3B2D), height: 1, indent: 56, endIndent: 8),
                _buildLauncherItem(
                  context,
                  'Raw Telemetry JSON Console',
                  'View live telemetry history packets and collapsible logs.',
                  Icons.terminal,
                  Colors.cyanAccent,
                  const RawLogsScreen(),
                ),
              ],
            ),
          ),
          
          const SizedBox(height: 16),

          // Diagnostics
          const Text(
            'System Diagnostics',
            style: TextStyle(color: Color(0xFF9CAAA2), fontWeight: FontWeight.normal, fontSize: 13),
          ),
          const SizedBox(height: 8),
          GlassCard(
            borderColor: Colors.transparent,
            backgroundColor: const Color(0xFF13261C).withOpacity(0.3),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                _buildDiagnosticRow('Database Engine', stats['database_engine'] ?? 'SQLite'),
                const Divider(color: Color(0xFF1F3B2D), height: 8),
                _buildDiagnosticRow('Database Size', '${stats['database_size_mb'] ?? 0} MB'),
                const Divider(color: Color(0xFF1F3B2D), height: 8),
                _buildDiagnosticRow('Registered Users', '${stats['users'] ?? 1}'),
                const Divider(color: Color(0xFF1F3B2D), height: 8),
                _buildDiagnosticRow('Total Linked Devices', '${stats['devices'] ?? 0}'),
                const Divider(color: Color(0xFF1F3B2D), height: 8),
                _buildDiagnosticRow('Stored Telemetry Packets', '${stats['sensor_records'] ?? 0}'),
                const SizedBox(height: 16),
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton(
                        onPressed: () => _exportBackup(false),
                        style: OutlinedButton.styleFrom(
                          side: const BorderSide(color: Color(0xFF1F3B2D)),
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(horizontal: 4),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(4.0),
                          ),
                        ),
                        child: const Text(
                          'Export JSON',
                          style: TextStyle(fontSize: 11),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: OutlinedButton(
                        onPressed: () => _exportBackup(true),
                        style: OutlinedButton.styleFrom(
                          side: const BorderSide(color: Color(0xFF7F1D1D)),
                          foregroundColor: const Color(0xFFFCA5A5),
                          padding: const EdgeInsets.symmetric(horizontal: 4),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(4.0),
                          ),
                        ),
                        child: const Text(
                          'Export + Keys',
                          style: TextStyle(fontSize: 11),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),

          const SizedBox(height: 16),

          // Retention limits
          const Text(
            'Data Retention Policies',
            style: TextStyle(color: Color(0xFF9CAAA2), fontWeight: FontWeight.normal, fontSize: 13),
          ),
          const SizedBox(height: 8),
          GlassCard(
            borderColor: Colors.transparent,
            backgroundColor: const Color(0xFF13261C).withOpacity(0.3),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: _sensorLimitController,
                        keyboardType: TextInputType.number,
                        style: const TextStyle(color: Colors.white, fontSize: 14),
                        decoration: const InputDecoration(
                          labelText: 'Telemetry Limit',
                          labelStyle: TextStyle(color: Color(0xFF9CAAA2)),
                          enabledBorder: UnderlineInputBorder(borderSide: BorderSide(color: Color(0xFF1F3B2D))),
                          focusedBorder: UnderlineInputBorder(borderSide: BorderSide(color: Color(0xFFA7DEC5))),
                        ),
                      ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: TextField(
                        controller: _logLimitController,
                        keyboardType: TextInputType.number,
                        style: const TextStyle(color: Colors.white, fontSize: 14),
                        decoration: const InputDecoration(
                          labelText: 'System Logs Limit',
                          labelStyle: TextStyle(color: Color(0xFF9CAAA2)),
                          enabledBorder: UnderlineInputBorder(borderSide: BorderSide(color: Color(0xFF1F3B2D))),
                          focusedBorder: UnderlineInputBorder(borderSide: BorderSide(color: Color(0xFFA7DEC5))),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 20),
                ElevatedButton(
                  onPressed: _isSavingRetention ? null : _saveRetention,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF13261C),
                    foregroundColor: const Color(0xFFA7DEC5),
                    side: const BorderSide(color: Color(0xFF1F3B2D)),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(4.0),
                    ),
                  ),
                  child: _isSavingRetention
                      ? const SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(strokeWidth: 2, valueColor: AlwaysStoppedAnimation(Color(0xFFA7DEC5))),
                        )
                      : const Text('Update Retention Policy'),
                ),
              ],
            ),
          ),

          const SizedBox(height: 24),

          // User details & Logout
          GlassCard(
            borderColor: Colors.transparent,
            backgroundColor: const Color(0xFF7F1D1D).withOpacity(0.1),
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        user['name'] ?? 'User Profile',
                        style: const TextStyle(color: Colors.white, fontWeight: FontWeight.normal, fontSize: 15),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        user['email'] ?? 'Unknown Email',
                        style: const TextStyle(color: Color(0xFF9CAAA2), fontSize: 12),
                      ),
                    ],
                  ),
                ),
                ElevatedButton.icon(
                  onPressed: () {
                    authProvider.logout();
                    deviceProvider.clear();
                  },
                  icon: const Icon(Icons.logout, size: 16),
                  label: const Text('LOGOUT'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF7F1D1D),
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(4.0),
                    ),
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
        ],
      ),
    );
  }

  Widget _buildLauncherItem(
    BuildContext context,
    String title,
    String description,
    IconData icon,
    Color accentColor,
    Widget targetScreen,
  ) {
    return InkWell(
      onTap: () {
        Navigator.push(
          context,
          MaterialPageRoute(builder: (context) => targetScreen),
        );
      },
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 12.0, horizontal: 8.0),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(10.0),
              decoration: BoxDecoration(
                color: accentColor.withOpacity(0.1),
                shape: BoxShape.circle,
              ),
              child: Icon(icon, color: accentColor, size: 22),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 14,
                      fontWeight: FontWeight.normal,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    description,
                    style: const TextStyle(
                      color: Color(0xFF9CAAA2),
                      fontSize: 11,
                    ),
                  ),
                ],
              ),
            ),
            const Icon(Icons.chevron_right, color: Color(0xFF9CAAA2), size: 20),
          ],
        ),
      ),
    );
  }

  Widget _buildDiagnosticRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4.0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Expanded(
            child: Text(
              label,
              style: const TextStyle(color: Color(0xFF9CAAA2), fontSize: 13),
              overflow: TextOverflow.ellipsis,
            ),
          ),
          const SizedBox(width: 8),
          Flexible(
            child: Text(
              value,
              style: GoogleFonts.jetBrainsMono(color: Colors.white, fontWeight: FontWeight.normal, fontSize: 13),
              overflow: TextOverflow.ellipsis,
              textAlign: TextAlign.end,
            ),
          ),
        ],
      ),
    );
  }
}
