import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

class ApiClient {
  static const String baseUrl = 'http://54.160.138.185:8000/api';
  
  // Callback to trigger logout when refresh fails or session is completely expired
  void Function()? onUnauthorized;

  ApiClient({this.onUnauthorized});

  Future<String?> _getAccessToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString('access_token');
  }

  Future<String?> _getRefreshToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString('refresh_token');
  }

  Future<void> _saveAccessToken(String token) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('access_token', token);
  }

  Future<void> _clearTokens() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('access_token');
    await prefs.remove('refresh_token');
  }

  Map<String, String> _buildHeaders(String? token) {
    return {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      if (token != null) 'Authorization': 'Bearer $token',
    };
  }

  Future<http.Response> get(String path, {Map<String, String>? queryParams}) async {
    final token = await _getAccessToken();
    var uri = Uri.parse('$baseUrl$path');
    if (queryParams != null) {
      uri = uri.replace(queryParameters: queryParams);
    }

    final response = await http.get(uri, headers: _buildHeaders(token));
    return _handleResponse(response, () => get(path, queryParams: queryParams));
  }

  Future<http.Response> post(String path, {dynamic body}) async {
    final token = await _getAccessToken();
    final uri = Uri.parse('$baseUrl$path');
    final encodedBody = body != null ? jsonEncode(body) : null;

    final response = await http.post(uri, headers: _buildHeaders(token), body: encodedBody);
    return _handleResponse(response, () => post(path, body: body));
  }

  Future<http.Response> put(String path, {dynamic body}) async {
    final token = await _getAccessToken();
    final uri = Uri.parse('$baseUrl$path');
    final encodedBody = body != null ? jsonEncode(body) : null;

    final response = await http.put(uri, headers: _buildHeaders(token), body: encodedBody);
    return _handleResponse(response, () => put(path, body: body));
  }

  Future<http.Response> patch(String path, {dynamic body}) async {
    final token = await _getAccessToken();
    final uri = Uri.parse('$baseUrl$path');
    final encodedBody = body != null ? jsonEncode(body) : null;

    final response = await http.patch(uri, headers: _buildHeaders(token), body: encodedBody);
    return _handleResponse(response, () => patch(path, body: body));
  }

  Future<http.Response> delete(String path) async {
    final token = await _getAccessToken();
    final uri = Uri.parse('$baseUrl$path');

    final response = await http.delete(uri, headers: _buildHeaders(token));
    return _handleResponse(response, () => delete(path));
  }

  // Token refresh logic and response interceptor
  Future<http.Response> _handleResponse(
    http.Response response,
    Future<http.Response> Function() retryCallback,
  ) async {
    // If unauthorized, try to refresh token
    if (response.statusCode == 401) {
      final refreshToken = await _getRefreshToken();
      if (refreshToken != null) {
        final refreshSuccess = await _attemptTokenRefresh(refreshToken);
        if (refreshSuccess) {
          // Retry the original request
          return await retryCallback();
        }
      }
      
      // If refresh failed or refresh token doesn't exist, log out
      await _clearTokens();
      if (onUnauthorized != null) {
        onUnauthorized!();
      }
    }
    return response;
  }

  Future<bool> _attemptTokenRefresh(String refreshToken) async {
    final uri = Uri.parse('$baseUrl/auth/refresh');
    try {
      final response = await http.post(
        uri,
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'refresh_token': refreshToken}),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final newAccessToken = data['access_token'];
        if (newAccessToken != null) {
          await _saveAccessToken(newAccessToken);
          return true;
        }
      }
    } catch (e) {
      print('Error refreshing token: $e');
    }
    return false;
  }
}
