import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../api/api_client.dart';

class AuthProvider extends ChangeNotifier {
  late final ApiClient _apiClient;
  Map<String, dynamic>? _user;
  bool _isLoading = true;
  String? _authError;

  AuthProvider() {
    _apiClient = ApiClient(onUnauthorized: logout);
    loadSession();
  }

  ApiClient get apiClient => _apiClient;
  Map<String, dynamic>? get user => _user;
  bool get isAuthenticated => _user != null;
  bool get isLoading => _isLoading;
  String? get authError => _authError;

  Future<void> loadSession() async {
    _isLoading = true;
    _authError = null;
    notifyListeners();

    try {
      final prefs = await SharedPreferences.getInstance();
      final accessToken = prefs.getString('access_token');
      if (accessToken != null) {
        final response = await _apiClient.get('/auth/me');
        if (response.statusCode == 200) {
          _user = jsonDecode(response.body);
        } else {
          _user = null;
        }
      } else {
        _user = null;
      }
    } catch (e) {
      print('Load session error: $e');
      _user = null;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<bool> login(String email, String password) async {
    _isLoading = true;
    _authError = null;
    notifyListeners();

    try {
      final response = await _apiClient.post('/auth/login', body: {
        'email': email,
        'password': password,
      });

      final responseData = jsonDecode(response.body);
      if (response.statusCode == 200) {
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString('access_token', responseData['access_token']);
        await prefs.setString('refresh_token', responseData['refresh_token']);
        _user = responseData['user'];
        _isLoading = false;
        notifyListeners();
        return true;
      } else {
        _authError = responseData['detail'] ?? 'Login failed';
      }
    } catch (e) {
      _authError = 'Network error occurred';
    }

    _isLoading = false;
    notifyListeners();
    return false;
  }

  Future<bool> register(String email, String password, String name) async {
    _isLoading = true;
    _authError = null;
    notifyListeners();

    try {
      final response = await _apiClient.post('/auth/register', body: {
        'email': email,
        'password': password,
        'name': name,
      });

      final responseData = jsonDecode(response.body);
      if (response.statusCode == 200) {
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString('access_token', responseData['access_token']);
        await prefs.setString('refresh_token', responseData['refresh_token']);
        _user = responseData['user'];
        _isLoading = false;
        notifyListeners();
        return true;
      } else {
        _authError = _parseErrorDetail(responseData['detail']) ?? 'Registration failed';
      }
    } catch (e) {
      _authError = 'Network error occurred';
    }

    _isLoading = false;
    notifyListeners();
    return false;
  }

  String? _parseErrorDetail(dynamic detail) {
    if (detail == null) return null;
    if (detail is String) return detail;
    if (detail is List && detail.isNotEmpty) {
      final first = detail.first;
      if (first is Map && first.containsKey('msg')) {
        return first['msg'].toString();
      }
    }
    return detail.toString();
  }

  Future<void> logout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('access_token');
    await prefs.remove('refresh_token');
    await prefs.remove('selected_device_id');
    _user = null;
    _authError = null;
    notifyListeners();
  }
}
