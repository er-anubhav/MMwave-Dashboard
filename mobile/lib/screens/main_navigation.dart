import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/device_provider.dart';
import 'dashboard_tab.dart';
import 'health_tab.dart';
import 'security_tab.dart';
import 'settings_tab.dart';

class MainNavigationScreen extends StatefulWidget {
  const MainNavigationScreen({Key? key}) : super(key: key);

  @override
  State<MainNavigationScreen> createState() => _MainNavigationScreenState();
}

class _MainNavigationScreenState extends State<MainNavigationScreen> {
  int _currentIndex = 0;

  @override
  void initState() {
    super.initState();
    // Initialize devices load on launch
    WidgetsBinding.instance.addPostFrameCallback((_) {
      Provider.of<DeviceProvider>(context, listen: false).init();
    });
  }

  @override
  Widget build(BuildContext context) {
    final deviceProvider = Provider.of<DeviceProvider>(context);
    final devices = deviceProvider.devices;
    final selectedDevice = deviceProvider.selectedDevice;
    final isStd = selectedDevice?.deviceId.toUpperCase().startsWith('STD') ?? false;

    final List<Widget> activeTabs = [
      const DashboardTab(),
      if (!isStd) const HealthSleepTab(),
      const SecurityActivityTab(),
      const SettingsTab(),
    ];

    final List<BottomNavigationBarItem> activeBarItems = [
      const BottomNavigationBarItem(
        icon: Icon(Icons.dashboard_outlined),
        activeIcon: Icon(Icons.dashboard),
        label: 'Dashboard',
      ),
      if (!isStd)
        const BottomNavigationBarItem(
          icon: Icon(Icons.health_and_safety_outlined),
          activeIcon: Icon(Icons.health_and_safety),
          label: 'Health',
        ),
      const BottomNavigationBarItem(
        icon: Icon(Icons.security_outlined),
        activeIcon: Icon(Icons.security),
        label: 'Security',
      ),
      const BottomNavigationBarItem(
        icon: Icon(Icons.settings_outlined),
        activeIcon: Icon(Icons.settings),
        label: 'Settings',
      ),
    ];

    int safeIndex = _currentIndex;
    if (safeIndex >= activeTabs.length) {
      safeIndex = activeTabs.length - 1;
    }
    if (safeIndex < 0) {
      safeIndex = 0;
    }

    return Scaffold(
      backgroundColor: const Color(0xFF0B1410),
      body: SafeArea(
        child: devices.isEmpty && !deviceProvider.isLoadingDevices
          ? Center(
              child: Padding(
                padding: const EdgeInsets.all(24.0),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(
                      Icons.settings_input_antenna,
                      size: 64,
                      color: Color(0xFF408A71),
                    ),
                    const SizedBox(height: 16),
                    const Text(
                      'No Devices Linked',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 20,
                        fontWeight: FontWeight.normal,
                      ),
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      'Link a device in settings or click below to register your first MMWave radar switch.',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        color: Color(0xFF9CAAA2),
                        fontSize: 14,
                      ),
                    ),
                    const SizedBox(height: 24),
                    ElevatedButton.icon(
                      onPressed: () {
                        setState(() {
                          _currentIndex = isStd ? 2 : 3; // Navigate to settings tab
                        });
                      },
                      icon: const Icon(Icons.add),
                      label: const Text('Go to Device Settings'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFFA7DEC5),
                        foregroundColor: Colors.black,
                        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(4.0),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            )
          : IndexedStack(
              index: safeIndex,
              children: activeTabs,
            ),
      ),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: safeIndex,
        onTap: (index) {
          setState(() {
            _currentIndex = index;
          });
        },
        backgroundColor: const Color(0xFF13261C),
        selectedItemColor: const Color(0xFFA7DEC5),
        unselectedItemColor: const Color(0xFF9CAAA2),
        type: BottomNavigationBarType.fixed,
        selectedLabelStyle: const TextStyle(fontWeight: FontWeight.normal, fontSize: 12),
        unselectedLabelStyle: const TextStyle(fontWeight: FontWeight.normal, fontSize: 12),
        items: activeBarItems,
      ),
    );
  }
}
