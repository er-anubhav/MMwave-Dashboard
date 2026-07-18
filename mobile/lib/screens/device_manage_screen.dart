import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../providers/device_provider.dart';
import '../models/device.dart';
import '../widgets/glass_card.dart';

class DeviceManagementScreen extends StatefulWidget {
  const DeviceManagementScreen({Key? key}) : super(key: key);

  @override
  State<DeviceManagementScreen> createState() => _DeviceManagementScreenState();
}

class _DeviceManagementScreenState extends State<DeviceManagementScreen> {
  final _linkIdController = TextEditingController();
  final _linkNameController = TextEditingController();
  String _selectedDeviceType = 'LYFSense_switch';

  @override
  void dispose() {
    _linkIdController.dispose();
    _linkNameController.dispose();
    super.dispose();
  }

  void _showLinkDeviceDialog() {
    _linkIdController.clear();
    _linkNameController.clear();
    _selectedDeviceType = 'LYFSense_switch';

    showDialog(
      context: context,
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setDialogState) {
            return AlertDialog(
              backgroundColor: const Color(0xFF13261C),
              shape: const RoundedRectangleBorder(
                borderRadius: BorderRadius.zero,
              ),
              title: const Text('Link New Device', style: TextStyle(color: Colors.white)),
              content: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    TextField(
                      controller: _linkIdController,
                      style: const TextStyle(color: Colors.white),
                      decoration: const InputDecoration(
                        labelText: 'Device ID',
                        labelStyle: TextStyle(color: Color(0xFF9CAAA2)),
                        enabledBorder: UnderlineInputBorder(borderSide: BorderSide(color: Color(0xFF1F3B2D))),
                        focusedBorder: UnderlineInputBorder(borderSide: BorderSide(color: Color(0xFFA7DEC5))),
                      ),
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: _linkNameController,
                      style: const TextStyle(color: Colors.white),
                      decoration: const InputDecoration(
                        labelText: 'Device Name (Optional)',
                        labelStyle: TextStyle(color: Color(0xFF9CAAA2)),
                        enabledBorder: UnderlineInputBorder(borderSide: BorderSide(color: Color(0xFF1F3B2D))),
                        focusedBorder: UnderlineInputBorder(borderSide: BorderSide(color: Color(0xFFA7DEC5))),
                      ),
                    ),
                  ],
                ),
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(context),
                  child: const Text('Cancel', style: TextStyle(color: Color(0xFF9CAAA2))),
                ),
                ElevatedButton(
                  onPressed: () => _submitLink(context),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFFA7DEC5),
                    foregroundColor: Colors.black,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(4.0),
                    ),
                  ),
                  child: const Text('Link Device'),
                ),
              ],
            );
          },
        );
      },
    );
  }

  void _submitLink(BuildContext dialogContext) async {
    final deviceId = _linkIdController.text.trim();
    final name = _linkNameController.text.trim();

    if (deviceId.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Device ID is required')),
      );
      return;
    }

    Navigator.pop(dialogContext); // Close linking inputs

    final deviceProvider = Provider.of<DeviceProvider>(context, listen: false);
    final result = await deviceProvider.linkDevice(deviceId, name, deviceType: _selectedDeviceType);

    if (result['success'] == true && mounted) {
      _showApiKeyResultDialog(result['apiKey'] ?? '');
    } else if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(result['error'] ?? 'Failed to link device'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  void _showApiKeyResultDialog(String apiKey) {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) {
        return AlertDialog(
          backgroundColor: const Color(0xFF13261C),
          shape: const RoundedRectangleBorder(
            borderRadius: BorderRadius.zero,
          ),
          title: const Text('Device Linked Successfully', style: TextStyle(color: Colors.white)),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Copy this API key to your device firmware configuration. You will not be able to view it again.',
                style: TextStyle(color: Color(0xFF9CAAA2), fontSize: 13),
              ),
              const SizedBox(height: 16),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.black.withOpacity(0.3),
                  borderRadius: BorderRadius.zero,
                  border: Border.all(color: const Color(0xFF1F3B2D)),
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: Text(
                        apiKey,
                        style: GoogleFonts.jetBrainsMono(
                          color: const Color(0xFFA7DEC5),
                          fontSize: 12,
                        ),
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.copy, color: Colors.white, size: 20),
                      onPressed: () {
                        Clipboard.setData(ClipboardData(text: apiKey));
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('API Key copied to clipboard')),
                        );
                      },
                    ),
                  ],
                ),
              ),
            ],
          ),
          actions: [
            ElevatedButton(
              onPressed: () => Navigator.pop(context),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFFA7DEC5),
                foregroundColor: Colors.black,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(4.0),
                ),
              ),
              child: const Text('I have copied the key'),
            ),
          ],
        );
      },
    );
  }

  void _showRenameDialog(Device device) {
    final controller = TextEditingController(text: device.name);
    showDialog(
      context: context,
      builder: (context) {
        return AlertDialog(
          backgroundColor: const Color(0xFF13261C),
          shape: const RoundedRectangleBorder(
            borderRadius: BorderRadius.zero,
          ),
          title: Text('Rename ${device.name}', style: const TextStyle(color: Colors.white)),
          content: TextField(
            controller: controller,
            style: const TextStyle(color: Colors.white),
            decoration: const InputDecoration(
              labelText: 'New Name',
              helperText: '* Tier is determined by the prefix of the Device ID (e.g. STD or PRO).',
              helperStyle: TextStyle(color: Color(0xFF9CAAA2), fontSize: 10),
              labelStyle: TextStyle(color: Color(0xFF9CAAA2)),
              enabledBorder: UnderlineInputBorder(borderSide: BorderSide(color: Color(0xFF1F3B2D))),
              focusedBorder: UnderlineInputBorder(borderSide: BorderSide(color: Color(0xFFA7DEC5))),
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Cancel', style: TextStyle(color: Color(0xFF9CAAA2))),
            ),
            ElevatedButton(
              onPressed: () async {
                final newName = controller.text.trim();
                if (newName.isNotEmpty) {
                  Navigator.pop(context);
                  final deviceProvider = Provider.of<DeviceProvider>(context, listen: false);
                  final success = await deviceProvider.renameDevice(device.deviceId, newName);
                  if (success && mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Device renamed successfully')),
                    );
                  }
                }
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFFA7DEC5),
                foregroundColor: Colors.black,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(4.0),
                ),
              ),
              child: const Text('Rename'),
            ),
          ],
        );
      },
    );
  }

  void _rotateKey(Device device) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: const Color(0xFF13261C),
        shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.zero,
        ),
        title: const Text('Rotate API Key', style: TextStyle(color: Colors.white)),
        content: const Text(
          'Rotating the API key will invalidate the existing key. Your ESP32 device will disconnect until you update its configurations. Continue?',
          style: TextStyle(color: Color(0xFF9CAAA2)),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel', style: TextStyle(color: Color(0xFF9CAAA2))),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF7F1D1D),
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(4.0),
              ),
            ),
            child: const Text('Rotate'),
          ),
        ],
      ),
    );

    if (confirm == true && mounted) {
      final deviceProvider = Provider.of<DeviceProvider>(context, listen: false);
      final newKey = await deviceProvider.rotateDeviceKey(device.deviceId);
      if (newKey != null && mounted) {
        _showApiKeyResultDialog(newKey);
      }
    }
  }

  void _calibrateDevice(Device device) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: const Color(0xFF13261C),
        shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.zero,
        ),
        title: Text('Calibrate ${device.name}', style: const TextStyle(color: Colors.white)),
        content: const Text(
          'Make sure the room is empty and stand clear for 5 seconds. Continue?',
          style: TextStyle(color: Color(0xFF9CAAA2)),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel', style: TextStyle(color: Color(0xFF9CAAA2))),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF1F3B2D),
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(4.0),
              ),
            ),
            child: const Text('Calibrate'),
          ),
        ],
      ),
    );

    if (confirm == true && mounted) {
      final deviceProvider = Provider.of<DeviceProvider>(context, listen: false);
      final success = await deviceProvider.calibrateDevice(device.deviceId);
      if (success && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Calibration command sent successfully')),
        );
      } else if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Failed to trigger calibration'), backgroundColor: Colors.red),
        );
      }
    }
  }

  void _unlinkDevice(Device device) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: const Color(0xFF13261C),
        shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.zero,
        ),
        title: Text('Unlink ${device.name}', style: const TextStyle(color: Colors.white)),
        content: const Text(
          'Are you sure you want to unlink this device? All sensor logs and automation history for this device will be deleted.',
          style: TextStyle(color: Color(0xFF9CAAA2)),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel', style: TextStyle(color: Color(0xFF9CAAA2))),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF7F1D1D),
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(4.0),
              ),
            ),
            child: const Text('Unlink'),
          ),
        ],
      ),
    );

    if (confirm == true && mounted) {
      final deviceProvider = Provider.of<DeviceProvider>(context, listen: false);
      final success = await deviceProvider.unlinkDevice(device.deviceId);
      if (success && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Device unlinked successfully')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final deviceProvider = Provider.of<DeviceProvider>(context);
    final devices = deviceProvider.devices;

    return Scaffold(
      backgroundColor: const Color(0xFF0B1410),
      appBar: AppBar(
        title: const Text('Device Management', style: TextStyle(color: Colors.white)),
        backgroundColor: const Color(0xFF13261C),
        elevation: 0,
        iconTheme: const IconThemeData(color: Colors.white),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16.0),
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Linked Devices (${devices.length})',
                style: const TextStyle(color: Color(0xFF9CAAA2), fontWeight: FontWeight.normal, fontSize: 13),
              ),
              ElevatedButton.icon(
                onPressed: _showLinkDeviceDialog,
                icon: const Icon(Icons.add, size: 16),
                label: const Text('Link Device', style: TextStyle(fontSize: 12)),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFFA7DEC5),
                  foregroundColor: Colors.black,
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(4.0),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          if (devices.isEmpty)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 40.0),
              child: Center(
                child: Text('No devices linked yet.', style: TextStyle(color: Color(0xFF9CAAA2))),
              ),
            )
          else
            ...devices.map((device) => _buildDeviceCard(device)).toList(),
        ],
      ),
    );
  }

  Widget _buildDeviceCard(Device device) {
    final isOnline = device.status == 'online';

    return GlassCard(
      margin: const EdgeInsets.symmetric(vertical: 8.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      device.name,
                      style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.normal),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      'ID: ${device.deviceId}',
                      style: GoogleFonts.jetBrainsMono(
                        color: const Color(0xFF9CAAA2),
                        fontSize: 12,
                        fontWeight: FontWeight.normal,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      'Tier: ${device.deviceId.toUpperCase().startsWith('STD') ? 'Standard (STD)' : device.deviceId.toUpperCase().startsWith('PRO') ? 'Pro (PRO)' : device.deviceType}',
                      style: const TextStyle(
                        color: Color(0xFFA7DEC5),
                        fontSize: 11,
                        fontWeight: FontWeight.normal,
                      ),
                    ),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: isOnline ? const Color(0xFFA7DEC5).withOpacity(0.1) : Colors.red.withOpacity(0.1),
                  borderRadius: BorderRadius.zero, // Zero border-radius
                  border: Border.all(color: isOnline ? const Color(0xFFA7DEC5) : Colors.red, width: 1),
                ),
                child: Text(
                  isOnline ? 'ONLINE' : 'OFFLINE',
                  style: TextStyle(
                    color: isOnline ? const Color(0xFFA7DEC5) : Colors.red,
                    fontSize: 9,
                    fontWeight: FontWeight.normal,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          // Actions bar
          Row(
            mainAxisAlignment: MainAxisAlignment.end,
            children: [
              TextButton.icon(
                onPressed: () => _showRenameDialog(device),
                icon: const Icon(Icons.edit, size: 16),
                label: const Text('Rename', style: TextStyle(fontSize: 12)),
                style: TextButton.styleFrom(foregroundColor: Colors.white70),
              ),
              const SizedBox(width: 8),
              TextButton.icon(
                onPressed: () => _calibrateDevice(device),
                icon: const Icon(Icons.tune, size: 16),
                label: const Text('Calibrate', style: TextStyle(fontSize: 12)),
                style: TextButton.styleFrom(foregroundColor: Colors.orangeAccent),
              ),
              const SizedBox(width: 8),
              TextButton.icon(
                onPressed: () => _rotateKey(device),
                icon: const Icon(Icons.vpn_key, size: 16),
                label: const Text('Key', style: TextStyle(fontSize: 12)),
                style: TextButton.styleFrom(foregroundColor: const Color(0xFFA7DEC5)),
              ),
              const SizedBox(width: 8),
              TextButton.icon(
                onPressed: () => _unlinkDevice(device),
                icon: const Icon(Icons.delete_forever, size: 16),
                label: const Text('Unlink', style: TextStyle(fontSize: 12)),
                style: TextButton.styleFrom(foregroundColor: Colors.redAccent),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
