import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../api/api_client.dart';
import '../models/device.dart';
import '../models/telemetry.dart';
import '../models/automation.dart';
import '../models/system_log.dart';

class DeviceProvider extends ChangeNotifier {
  final ApiClient _apiClient;
  
  List<Device> _devices = [];
  Device? _selectedDevice;
  bool _isLoadingDevices = false;
  
  // Real-time telemetry state
  Telemetry? _telemetry;
  Timer? _pollingTimer;
  bool _isConnected = false;
  
  // Automations state
  List<Automation> _routines = [];
  List<Automation> _rules = [];
  List<Map<String, dynamic>> _automationHistory = [];
  bool _isLoadingAutomations = false;
  
  // Logs state
  List<SystemLog> _systemLogs = [];
  List<SystemLog> _notifications = [];
  
  // Diagnostics & settings
  Map<String, dynamic>? _diagnostics;
  Map<String, int> _retention = {'sensor_record_limit': 1000, 'log_limit': 1000};
  
  DeviceProvider(this._apiClient);

  List<Device> get devices => _devices;
  Device? get selectedDevice => _selectedDevice;
  bool get isLoadingDevices => _isLoadingDevices;
  Telemetry? get telemetry => _telemetry;
  bool get isConnected => _isConnected;
  
  List<Automation> get routines => _routines;
  List<Automation> get rules => _rules;
  List<Map<String, dynamic>> get automationHistory => _automationHistory;
  bool get isLoadingAutomations => _isLoadingAutomations;
  
  List<SystemLog> get systemLogs => _systemLogs;
  List<SystemLog> get notifications => _notifications;
  Map<String, dynamic>? get diagnostics => _diagnostics;
  Map<String, int> get retention => _retention;

  // Initial load
  Future<void> init() async {
    await loadDevices();
  }

  // Clear all states (used on logout)
  void clear() {
    _stopPolling();
    _devices = [];
    _selectedDevice = null;
    _telemetry = null;
    _isConnected = false;
    _routines = [];
    _rules = [];
    _automationHistory = [];
    _systemLogs = [];
    _notifications = [];
    _diagnostics = null;
    notifyListeners();
  }

  Future<void> loadDevices() async {
    _isLoadingDevices = true;
    notifyListeners();

    try {
      final response = await _apiClient.get('/devices');
      if (response.statusCode == 200) {
        final List<dynamic> data = jsonDecode(response.body);
        _devices = data.map((json) => Device.fromJson(json)).toList();
        
        // Auto select device
        if (_devices.isNotEmpty) {
          final prefs = await SharedPreferences.getInstance();
          final savedId = prefs.getString('selected_device_id');
          final matchingDevice = _devices.firstWhere(
            (d) => d.deviceId == savedId,
            orElse: () => _devices.first,
          );
          await selectDevice(matchingDevice);
        } else {
          _selectedDevice = null;
          _stopPolling();
        }
      }
    } catch (e) {
      print('Load devices error: $e');
    } finally {
      _isLoadingDevices = false;
      notifyListeners();
    }
  }

  Future<void> selectDevice(Device device) async {
    _selectedDevice = device;
    notifyListeners();
    
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('selected_device_id', device.deviceId);
    
    // Start polling telemetry for this device
    _startPolling();
    
    // Load automations and settings for this device
    loadAutomations();
    loadSystemLogs();
    loadNotifications();
  }

  // --- Real-time telemetry polling ---
  void _startPolling() {
    _stopPolling();
    if (_selectedDevice == null) return;
    
    // Initial immediate fetch
    _fetchTelemetry();
    
    _pollingTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      _fetchTelemetry();
    });
  }

  void _stopPolling() {
    _pollingTimer?.cancel();
    _pollingTimer = null;
  }

  Future<void> _fetchTelemetry() async {
    if (_selectedDevice == null) return;
    
    try {
      final response = await _apiClient.get(
        '/data',
        queryParams: {'device_id': _selectedDevice!.deviceId},
      );
      
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        _telemetry = Telemetry.fromJson(data);
        _isConnected = _telemetry?.lastUpdated != null;
      } else {
        _isConnected = false;
      }
      notifyListeners();
    } catch (e) {
      print('Fetch telemetry error: $e');
      _isConnected = false;
      notifyListeners();
    }
  }

  // --- Controls: Mode & Relay ---
  Future<bool> switchMode(String newMode) async {
    if (_selectedDevice == null) return false;
    
    try {
      final response = await _apiClient.post('/mode', body: {
        'device_id': _selectedDevice!.deviceId,
        'mode': newMode,
      });
      
      if (response.statusCode == 200) {
        if (_telemetry != null) {
          _telemetry = Telemetry(
            deviceId: _telemetry!.deviceId,
            mode: newMode,
            relay: _telemetry!.relay,
            relayMode: _telemetry!.relayMode,
            sensorData: _telemetry!.sensorData,
            lastUpdated: _telemetry!.lastUpdated,
          );
        }
        notifyListeners();
        return true;
      }
    } catch (e) {
      print('Switch mode error: $e');
    }
    return false;
  }

  Future<bool> controlRelay(bool state, String mode) async {
    if (_selectedDevice == null) return false;
    
    try {
      final response = await _apiClient.post('/relay', body: {
        'device_id': _selectedDevice!.deviceId,
        'relay': state,
        'relay_mode': mode,
      });
      
      if (response.statusCode == 200) {
        final responseData = jsonDecode(response.body);
        final returnedRelay = responseData['relay'] ?? state;
        final returnedRelayMode = responseData['relay_mode'] ?? mode;
        
        if (_telemetry != null) {
          _telemetry = Telemetry(
            deviceId: _telemetry!.deviceId,
            mode: _telemetry!.mode,
            relay: returnedRelay,
            relayMode: returnedRelayMode,
            sensorData: _telemetry!.sensorData,
            lastUpdated: _telemetry!.lastUpdated,
          );
        }
        notifyListeners();
        return true;
      }
    } catch (e) {
      print('Control relay error: $e');
    }
    return false;
  }

  // --- Device operations ---
  Future<Map<String, dynamic>> linkDevice(String deviceId, String name, {String deviceType = 'LYFSense_switch'}) async {
    try {
      final response = await _apiClient.post('/devices/link', body: {
        'device_id': deviceId,
        'name': name,
        'device_type': deviceType,
      });
      
      final responseData = jsonDecode(response.body);
      if (response.statusCode == 200) {
        await loadDevices();
        return {
          'success': true,
          'message': responseData['message'],
          'apiKey': responseData['api_key'],
        };
      }
      return {
        'success': false,
        'error': responseData['detail'] ?? 'Failed to link device',
      };
    } catch (e) {
      return {'success': false, 'error': 'Network error'};
    }
  }

  Future<bool> renameDevice(String deviceId, String name) async {
    try {
      final response = await _apiClient.patch('/devices/$deviceId', body: {
        'name': name,
      });
      if (response.statusCode == 200) {
        await loadDevices();
        return true;
      }
    } catch (e) {
      print('Rename device error: $e');
    }
    return false;
  }

  Future<bool> unlinkDevice(String deviceId) async {
    try {
      final response = await _apiClient.delete('/devices/$deviceId/unlink');
      if (response.statusCode == 200) {
        if (_selectedDevice?.deviceId == deviceId) {
          _selectedDevice = null;
          _stopPolling();
        }
        await loadDevices();
        return true;
      }
    } catch (e) {
      print('Unlink device error: $e');
    }
    return false;
  }

  Future<String?> rotateDeviceKey(String deviceId) async {
    try {
      final response = await _apiClient.post('/devices/$deviceId/rotate-key');
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return data['api_key'];
      }
    } catch (e) {
      print('Rotate device key error: $e');
    }
    return null;
  }

  // --- Automations management ---
  Future<void> loadAutomations() async {
    if (_selectedDevice == null) return;
    _isLoadingAutomations = true;
    notifyListeners();
    
    try {
      final responses = await Future.wait([
        _apiClient.get('/automations', queryParams: {'device_id': _selectedDevice!.deviceId}),
        _apiClient.get('/automations/history', queryParams: {'device_id': _selectedDevice!.deviceId, 'limit': '15'}),
      ]);
      
      if (responses[0].statusCode == 200) {
        final data = jsonDecode(responses[0].body);
        final List<dynamic> items = data['automations'] ?? [];
        final mapped = items.map((json) => Automation.fromJson(json)).toList();
        
        _routines = mapped.where((a) => a.automationType == 'routine').toList();
        _rules = mapped.where((a) => a.automationType == 'rule').toList();
      }
      
      if (responses[1].statusCode == 200) {
        final data = jsonDecode(responses[1].body);
        final List<dynamic> historyItems = data['history'] ?? [];
        _automationHistory = historyItems.cast<Map<String, dynamic>>();
      }
    } catch (e) {
      print('Load automations error: $e');
    } finally {
      _isLoadingAutomations = false;
      notifyListeners();
    }
  }

  Future<bool> toggleAutomation(Automation automation, bool nextActive) async {
    try {
      final response = await _apiClient.put('/automations/${automation.id}', body: {
        'title': automation.title,
        'description': automation.description,
        'active': nextActive,
        'data': {
          'trigger': automation.trigger,
          'action': automation.action,
          'cooldown_seconds': automation.cooldownSeconds,
          'tags': automation.tags,
          'time': automation.time,
        }
      });
      
      if (response.statusCode == 200) {
        await loadAutomations();
        return true;
      }
    } catch (e) {
      print('Toggle automation error: $e');
    }
    return false;
  }

  Future<bool> createAutomation({
    required String title,
    required String description,
    required String automationType,
    required String trigger,
    required String action,
    required int cooldownSeconds,
    required String time,
  }) async {
    if (_selectedDevice == null) return false;
    
    try {
      final response = await _apiClient.post('/automations', body: {
        'device_id': _selectedDevice!.deviceId,
        'automation_type': automationType,
        'title': title,
        'description': description,
        'active': true,
        'data': {
          'trigger': trigger,
          'action': action,
          'cooldown_seconds': cooldownSeconds,
          'time': time,
        }
      });
      
      if (response.statusCode == 200) {
        await loadAutomations();
        return true;
      }
    } catch (e) {
      print('Create automation error: $e');
    }
    return false;
  }

  Future<bool> updateAutomation(Automation automation, {
    required String title,
    required String description,
    required String trigger,
    required String action,
    required int cooldownSeconds,
    required String time,
  }) async {
    try {
      final response = await _apiClient.put('/automations/${automation.id}', body: {
        'title': title,
        'description': description,
        'active': automation.active,
        'data': {
          'trigger': trigger,
          'action': action,
          'cooldown_seconds': cooldownSeconds,
          'time': time,
        }
      });
      
      if (response.statusCode == 200) {
        await loadAutomations();
        return true;
      }
    } catch (e) {
      print('Update automation error: $e');
    }
    return false;
  }

  Future<bool> deleteAutomation(int id) async {
    try {
      final response = await _apiClient.delete('/automations/$id');
      if (response.statusCode == 200) {
        await loadAutomations();
        return true;
      }
    } catch (e) {
      print('Delete automation error: $e');
    }
    return false;
  }

  // --- Telemetry logs and console history ---
  Future<List<Map<String, dynamic>>> fetchTelemetryHistory(int limit) async {
    if (_selectedDevice == null) return [];
    try {
      final response = await _apiClient.get(
        '/data/history',
        queryParams: {'device_id': _selectedDevice!.deviceId, 'limit': limit.toString()},
      );
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final List<dynamic> items = data['history'] ?? [];
        return items.cast<Map<String, dynamic>>();
      }
    } catch (e) {
      print('Fetch history error: $e');
    }
    return [];
  }

  // --- Logs and Notifications ---
  Future<void> loadSystemLogs() async {
    if (_selectedDevice == null) return;
    try {
      final response = await _apiClient.get(
        '/logs',
        queryParams: {'device_id': _selectedDevice!.deviceId, 'limit': '30'},
      );
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final List<dynamic> items = data['logs'] ?? [];
        _systemLogs = items.map((json) => SystemLog.fromJson(json)).toList();
        notifyListeners();
      }
    } catch (e) {
      print('Load system logs error: $e');
    }
  }

  Future<void> loadNotifications() async {
    try {
      final response = await _apiClient.get(
        '/notifications/history',
        queryParams: _selectedDevice != null ? {'device_id': _selectedDevice!.deviceId} : null,
      );
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final List<dynamic> items = data['notifications'] ?? [];
        _notifications = items.map((json) => SystemLog.fromJson(json)).toList();
        notifyListeners();
      }
    } catch (e) {
      print('Load notifications error: $e');
    }
  }

  Future<bool> sendTestNotification(String message, {String? provider}) async {
    try {
      final response = await _apiClient.post('/notifications/test', body: {
        if (provider != null) 'provider': provider,
        if (_selectedDevice != null) 'device_id': _selectedDevice!.deviceId,
        'message': message,
      });
      if (response.statusCode == 200) {
        await loadNotifications();
        return true;
      }
    } catch (e) {
      print('Send test notification error: $e');
    }
    return false;
  }

  // --- Diagnostics and settings ---
  Future<void> loadDiagnosticsAndSettings() async {
    try {
      final responses = await Future.wait([
        _apiClient.get('/diagnostics'),
        _apiClient.get('/settings/retention'),
      ]);
      
      if (responses[0].statusCode == 200) {
        _diagnostics = jsonDecode(responses[0].body);
      }
      
      if (responses[1].statusCode == 200) {
        final data = jsonDecode(responses[1].body);
        _retention = {
          'sensor_record_limit': data['sensor_record_limit'] ?? 1000,
          'log_limit': data['log_limit'] ?? 1000,
        };
      }
      notifyListeners();
    } catch (e) {
      print('Load settings error: $e');
    }
  }

  Future<bool> updateRetentionSettings(int sensorLimit, int logLimit) async {
    try {
      final response = await _apiClient.put('/settings/retention', body: {
        'sensor_record_limit': sensorLimit,
        'log_limit': logLimit,
      });
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        _retention = {
          'sensor_record_limit': data['sensor_record_limit'] ?? sensorLimit,
          'log_limit': data['log_limit'] ?? logLimit,
        };
        notifyListeners();
        return true;
      }
    } catch (e) {
      print('Update retention settings error: $e');
    }
    return false;
  }

  Future<Map<String, dynamic>?> exportBackup(bool includeSecrets) async {
    try {
      final response = await _apiClient.get(
        '/backup/export',
        queryParams: {'include_secrets': includeSecrets.toString()},
      );
      if (response.statusCode == 200) {
        return jsonDecode(response.body) as Map<String, dynamic>;
      }
    } catch (e) {
      print('Export backup error: $e');
    }
    return null;
  }

  @override
  void dispose() {
    _stopPolling();
    super.dispose();
  }
}
