import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../providers/device_provider.dart';
import '../widgets/glass_card.dart';

class RawLogsScreen extends StatefulWidget {
  const RawLogsScreen({Key? key}) : super(key: key);

  @override
  State<RawLogsScreen> createState() => _RawLogsScreenState();
}

class _RawLogsScreenState extends State<RawLogsScreen> {
  List<Map<String, dynamic>> _history = [];
  bool _autoRefresh = true;
  Timer? _refreshTimer;
  int _expandedIndex = -1;
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    _fetchHistory();
    _startTimer();
  }

  @override
  void dispose() {
    _refreshTimer?.cancel();
    super.dispose();
  }

  void _startTimer() {
    _refreshTimer?.cancel();
    if (!_autoRefresh) return;

    _refreshTimer = Timer.periodic(const Duration(seconds: 2), (timer) {
      _fetchHistory();
    });
  }

  void _fetchHistory() async {
    if (!mounted) return;
    final deviceProvider = Provider.of<DeviceProvider>(context, listen: false);
    if (deviceProvider.selectedDevice == null) return;

    if (_history.isEmpty) {
      setState(() {
        _isLoading = true;
      });
    }

    final data = await deviceProvider.fetchTelemetryHistory(50);
    
    if (mounted) {
      setState(() {
        _history = data;
        _isLoading = false;
      });
    }
  }

  void _toggleAutoRefresh(bool value) {
    setState(() {
      _autoRefresh = value;
    });
    if (value) {
      _startTimer();
    } else {
      _refreshTimer?.cancel();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0B1410),
      appBar: AppBar(
        title: const Text('Raw Telemetry Logs', style: TextStyle(color: Colors.white)),
        backgroundColor: const Color(0xFF13261C),
        elevation: 0,
        iconTheme: const IconThemeData(color: Colors.white),
        actions: [
          Row(
            children: [
              const Text('Auto', style: TextStyle(color: Color(0xFF9CAAA2), fontSize: 12, fontWeight: FontWeight.normal)),
              Switch(
                value: _autoRefresh,
                activeColor: const Color(0xFFA7DEC5),
                onChanged: _toggleAutoRefresh,
              ),
            ],
          ),
        ],
      ),
      body: _isLoading
          ? const Center(
              child: CircularProgressIndicator(
                valueColor: AlwaysStoppedAnimation<Color>(Color(0xFFA7DEC5)),
              ),
            )
          : _history.isEmpty
              ? const Center(
                  child: Text('No telemetry history packets found.', style: TextStyle(color: Color(0xFF9CAAA2))),
                )
              : ListView.builder(
                  padding: const EdgeInsets.all(16.0),
                  itemCount: _history.length,
                  itemBuilder: (context, index) {
                    final packet = _history[index];
                    final isExpanded = _expandedIndex == index;
                    final sensorData = packet['sensor_data'] ?? {};
                    final timestamp = packet['timestamp'] ?? packet['last_updated'] ?? 'N/A';
                    final mode = packet['mode'] ?? 'fall';

                    return GlassCard(
                      margin: const EdgeInsets.symmetric(vertical: 6.0),
                      borderColor: isExpanded ? const Color(0xFFA7DEC5).withOpacity(0.4) : null,
                      padding: EdgeInsets.zero,
                      child: Column(
                        children: [
                          ListTile(
                            contentPadding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
                            leading: Container(
                              padding: const EdgeInsets.all(8),
                              decoration: const BoxDecoration(
                                color: Color(0xFF13261C),
                                shape: BoxShape.circle,
                              ),
                              child: const Icon(Icons.description, color: Color(0xFFA7DEC5), size: 20),
                            ),
                            title: Row(
                              children: [
                                Text(
                                  mode.toString().toUpperCase(),
                                  style: GoogleFonts.jetBrainsMono(
                                    color: Colors.white,
                                    fontSize: 13,
                                    fontWeight: FontWeight.normal,
                                  ),
                                ),
                                const SizedBox(width: 8),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                  decoration: BoxDecoration(
                                    color: Colors.white.withOpacity(0.05),
                                    borderRadius: BorderRadius.zero, // Zero border-radius
                                  ),
                                  child: Text(
                                    'Act: ${sensorData['activity'] ?? 0}',
                                    style: GoogleFonts.jetBrainsMono(
                                      color: Colors.orangeAccent,
                                      fontSize: 9,
                                      fontWeight: FontWeight.normal,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            subtitle: Padding(
                              padding: const EdgeInsets.only(top: 4.0),
                              child: Text(
                                'Time: $timestamp',
                                style: GoogleFonts.jetBrainsMono(
                                  color: const Color(0xFF9CAAA2),
                                  fontSize: 11,
                                ),
                              ),
                            ),
                            trailing: Icon(
                              isExpanded ? Icons.keyboard_arrow_up : Icons.keyboard_arrow_down,
                              color: const Color(0xFF9CAAA2),
                            ),
                            onTap: () {
                              setState(() {
                                _expandedIndex = isExpanded ? -1 : index;
                              });
                            },
                          ),
                          if (isExpanded) ...[
                            const Divider(color: Color(0xFF1F3B2D), height: 1),
                            Container(
                              width: double.maxFinite,
                              padding: const EdgeInsets.all(16.0),
                              color: Colors.black.withOpacity(0.4),
                              child: SingleChildScrollView(
                                scrollDirection: Axis.horizontal,
                                child: SelectionArea(
                                  child: Text(
                                    const JsonEncoder.withIndent('  ').convert(packet),
                                    style: GoogleFonts.jetBrainsMono(
                                      fontSize: 11,
                                      color: const Color(0xFF9CAAA2),
                                    ),
                                  ),
                                ),
                              ),
                            ),
                          ],
                        ],
                      ),
                    );
                  },
                ),
    );
  }
}
