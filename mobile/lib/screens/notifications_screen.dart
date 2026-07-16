import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../providers/device_provider.dart';
import '../widgets/glass_card.dart';

class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({Key? key}) : super(key: key);

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  final _testMsgController = TextEditingController(text: 'Test alert from LYFSense Mobile App');
  bool _isSendingTest = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      Provider.of<DeviceProvider>(context, listen: false).loadNotifications();
    });
  }

  @override
  void dispose() {
    _testMsgController.dispose();
    super.dispose();
  }

  void _sendTestAlert() async {
    final msg = _testMsgController.text.trim();
    if (msg.isEmpty) return;

    setState(() {
      _isSendingTest = true;
    });

    final deviceProvider = Provider.of<DeviceProvider>(context, listen: false);
    final success = await deviceProvider.sendTestNotification(msg);

    if (mounted) {
      setState(() {
        _isSendingTest = false;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(success ? 'Test notification queued successfully!' : 'Failed to send test notification'),
          backgroundColor: success ? Colors.green : Colors.red,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final deviceProvider = Provider.of<DeviceProvider>(context);
    final notifications = deviceProvider.notifications;

    return Scaffold(
      backgroundColor: const Color(0xFF0B1410),
      appBar: AppBar(
        title: const Text('Notifications', style: TextStyle(color: Colors.white)),
        backgroundColor: const Color(0xFF13261C),
        elevation: 0,
        iconTheme: const IconThemeData(color: Colors.white),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Alert Channel Statuses (Telegram, WhatsApp, Email, Webhook)
            const Text(
              'Notification Integrations',
              style: TextStyle(color: Color(0xFF9CAAA2), fontWeight: FontWeight.normal, fontSize: 13),
            ),
            const SizedBox(height: 8),
            _buildChannelCard('Telegram Bot Channel', 'Connected', const Color(0xFFA7DEC5), Icons.telegram),
            _buildChannelCard('WhatsApp Alerts API', 'Connected', const Color(0xFFA7DEC5), Icons.chat),
            _buildChannelCard('Email Alerts Server', 'Connected', Colors.amberAccent, Icons.email),
            _buildChannelCard('Custom Webhook API', 'Inactive', const Color(0xFF9CAAA2), Icons.api),
            const SizedBox(height: 20),

            // Test dispatch console
            const Text(
              'Trigger Diagnostic Alert',
              style: TextStyle(color: Color(0xFF9CAAA2), fontWeight: FontWeight.normal, fontSize: 13),
            ),
            const SizedBox(height: 8),
            GlassCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  TextField(
                    controller: _testMsgController,
                    style: const TextStyle(color: Colors.white, fontSize: 13),
                    decoration: const InputDecoration(
                      labelText: 'Test Notification Message',
                      labelStyle: TextStyle(color: Color(0xFF9CAAA2)),
                      enabledBorder: UnderlineInputBorder(borderSide: BorderSide(color: Color(0xFF1F3B2D))),
                      focusedBorder: UnderlineInputBorder(borderSide: BorderSide(color: Color(0xFFA7DEC5))),
                    ),
                  ),
                  const SizedBox(height: 16),
                  ElevatedButton(
                    onPressed: _isSendingTest ? null : _sendTestAlert,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF13261C),
                      foregroundColor: const Color(0xFFA7DEC5),
                      side: const BorderSide(color: Color(0xFF1F3B2D)),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(4.0),
                      ),
                    ),
                    child: _isSendingTest
                        ? const SizedBox(
                            width: 16,
                            height: 16,
                            child: CircularProgressIndicator(strokeWidth: 2, valueColor: AlwaysStoppedAnimation(Color(0xFFA7DEC5))),
                          )
                        : const Text('Send Test Alert'),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // Dispatch log list
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  'Recent Notifications Activity',
                  style: TextStyle(color: Color(0xFF9CAAA2), fontWeight: FontWeight.normal, fontSize: 13),
                ),
                IconButton(
                  icon: const Icon(Icons.refresh, color: Color(0xFFA7DEC5), size: 20),
                  onPressed: () => deviceProvider.loadNotifications(),
                ),
              ],
            ),
            const SizedBox(height: 8),
            if (notifications.isEmpty)
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 40.0),
                child: Center(
                  child: Text('No recent notifications dispatched.', style: TextStyle(color: Color(0xFF9CAAA2))),
                ),
              )
            else
              ListView.builder(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: notifications.length,
                itemBuilder: (context, index) {
                  final alert = notifications[index];
                  final meta = alert.metadata;
                  final providerName = meta['provider'] ?? 'system';
                  
                  return GlassCard(
                    margin: const EdgeInsets.symmetric(vertical: 6.0),
                    child: Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(8),
                          decoration: const BoxDecoration(
                            color: Color(0xFF13261C),
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(Icons.notifications, color: Color(0xFFA7DEC5), size: 20),
                        ),
                        const SizedBox(width: 14),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                alert.event,
                                style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.normal),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                'Channel: ${providerName.toString().toUpperCase()} (Severity: ${meta['severity'] ?? 'info'})',
                                style: const TextStyle(color: Color(0xFF9CAAA2), fontSize: 11),
                              ),
                            ],
                          ),
                        ),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.end,
                          children: [
                            Text(
                              alert.createdAt != null ? alert.createdAt!.split(' ').last : '',
                              style: GoogleFonts.jetBrainsMono(color: const Color(0xFF9CAAA2), fontSize: 11),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              alert.status.toUpperCase(),
                              style: GoogleFonts.jetBrainsMono(
                                color: alert.status.toLowerCase() == 'queued' || alert.status.toLowerCase() == 'sent'
                                    ? const Color(0xFFA7DEC5)
                                    : Colors.orangeAccent,
                                fontSize: 11,
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
    );
  }

  Widget _buildChannelCard(String name, String status, Color color, IconData icon) {
    return GlassCard(
      margin: const EdgeInsets.symmetric(vertical: 4.0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            children: [
              Icon(icon, color: color, size: 22),
              const SizedBox(width: 12),
              Text(name, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.normal, fontSize: 14)),
            ],
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            decoration: BoxDecoration(
              color: color.withOpacity(0.1),
              borderRadius: BorderRadius.zero, // Zero border-radius
              border: Border.all(color: color, width: 1),
            ),
            child: Text(
              status.toUpperCase(),
              style: GoogleFonts.jetBrainsMono(color: color, fontSize: 9, fontWeight: FontWeight.normal),
            ),
          ),
        ],
      ),
    );
  }
}
