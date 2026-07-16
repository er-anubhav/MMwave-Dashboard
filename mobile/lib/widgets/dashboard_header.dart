import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/device_provider.dart';

class DashboardHeader extends StatelessWidget {
  const DashboardHeader({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final deviceProvider = Provider.of<DeviceProvider>(context);
    final selectedDevice = deviceProvider.selectedDevice;
    final devices = deviceProvider.devices;

    if (devices.isEmpty) {
      return Container(
        margin: const EdgeInsets.only(bottom: 16),
        padding: const EdgeInsets.symmetric(vertical: 8),
        child: const Text(
          'LYFSense Console',
          style: TextStyle(
            color: Colors.white,
            fontSize: 18,
            fontWeight: FontWeight.normal,
          ),
        ),
      );
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        children: [
          // Styled Device Switcher Dropdown
          Expanded(
            child: Container(
              height: 42,
              padding: const EdgeInsets.symmetric(horizontal: 12),
              decoration: BoxDecoration(
                color: const Color(0xFF13261C),
                borderRadius: BorderRadius.circular(4.0),
                border: Border.all(color: const Color(0xFF1F3B2D)),
              ),
              child: DropdownButtonHideUnderline(
                child: DropdownButton<String>(
                  value: selectedDevice?.deviceId,
                  dropdownColor: const Color(0xFF13261C),
                  icon: const Icon(Icons.unfold_more, color: Color(0xFFA7DEC5), size: 18),
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 13,
                    fontWeight: FontWeight.normal,
                  ),
                  isExpanded: true,
                  items: devices.map((d) {
                    return DropdownMenuItem<String>(
                      value: d.deviceId,
                      child: Row(
                        children: [
                          Icon(
                            Icons.circle,
                            color: d.status == 'online' ? const Color(0xFFA7DEC5) : Colors.red,
                            size: 8,
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Text(
                              d.name,
                              style: const TextStyle(color: Colors.white, fontSize: 13),
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ],
                      ),
                    );
                  }).toList(),
                  onChanged: (id) {
                    if (id != null) {
                      final matched = devices.firstWhere((d) => d.deviceId == id);
                      deviceProvider.selectDevice(matched);
                    }
                  },
                ),
              ),
            ),
          ),
          const SizedBox(width: 12),
          // Status Badge
          if (selectedDevice != null)
            Container(
              height: 42,
              padding: const EdgeInsets.symmetric(horizontal: 12),
              alignment: Alignment.center,
              decoration: BoxDecoration(
                color: selectedDevice.status == 'online'
                    ? const Color(0xFFA7DEC5).withOpacity(0.08)
                    : Colors.red.withOpacity(0.08),
                borderRadius: BorderRadius.circular(4.0),
                border: Border.all(
                  color: selectedDevice.status == 'online' ? const Color(0xFFA7DEC5) : Colors.red,
                  width: 1,
                ),
              ),
              child: Text(
                selectedDevice.status == 'online' ? 'ONLINE' : 'OFFLINE',
                style: TextStyle(
                  color: selectedDevice.status == 'online' ? const Color(0xFFA7DEC5) : Colors.red,
                  fontSize: 10,
                  fontWeight: FontWeight.normal,
                  letterSpacing: 0.5,
                ),
              ),
            ),
        ],
      ),
    );
  }
}
