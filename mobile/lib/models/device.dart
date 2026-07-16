class Device {
  final int? id;
  final String deviceId;
  final String name;
  final String deviceType;
  final int? userId;
  final String desiredMode;
  final bool desiredRelay;
  final String relayMode;
  final String? firmwareVersion;
  final int? wifiRssi;
  final String? ipAddress;
  final int? uptimeSeconds;
  final String? lastSeen;
  final String status;
  final int? secondsSinceSeen;
  final String? offlineSince;
  final String? apiKey;

  Device({
    this.id,
    required this.deviceId,
    required this.name,
    required this.deviceType,
    this.userId,
    required this.desiredMode,
    required this.desiredRelay,
    required this.relayMode,
    this.firmwareVersion,
    this.wifiRssi,
    this.ipAddress,
    this.uptimeSeconds,
    this.lastSeen,
    required this.status,
    this.secondsSinceSeen,
    this.offlineSince,
    this.apiKey,
  });

  factory Device.fromJson(Map<String, dynamic> json) {
    return Device(
      id: json['id'],
      deviceId: json['device_id'] ?? '',
      name: json['name'] ?? '',
      deviceType: json['device_type'] ?? 'LYFSense_switch',
      userId: json['user_id'],
      desiredMode: json['desired_mode'] ?? json['mode'] ?? 'fall',
      desiredRelay: json['desired_relay'] ?? json['relay'] ?? false,
      relayMode: json['relay_mode'] ?? 'manual',
      firmwareVersion: json['firmware_version'],
      wifiRssi: json['wifi_rssi'],
      ipAddress: json['ip_address'],
      uptimeSeconds: json['uptime_seconds'],
      lastSeen: json['last_seen'],
      status: json['status'] ?? 'offline',
      secondsSinceSeen: json['seconds_since_seen'],
      offlineSince: json['offline_since'],
      apiKey: json['api_key'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'device_id': deviceId,
      'name': name,
      'device_type': deviceType,
      'user_id': userId,
      'desired_mode': desiredMode,
      'desired_relay': desiredRelay,
      'relay_mode': relayMode,
      'firmware_version': firmwareVersion,
      'wifi_rssi': wifiRssi,
      'ip_address': ipAddress,
      'uptime_seconds': uptimeSeconds,
      'last_seen': lastSeen,
      'status': status,
      'seconds_since_seen': secondsSinceSeen,
      'offline_since': offlineSince,
      if (apiKey != null) 'api_key': apiKey,
    };
  }

  Device copyWith({
    String? name,
    String? desiredMode,
    bool? desiredRelay,
    String? relayMode,
    String? status,
  }) {
    return Device(
      id: id,
      deviceId: deviceId,
      name: name ?? this.name,
      deviceType: deviceType,
      userId: userId,
      desiredMode: desiredMode ?? this.desiredMode,
      desiredRelay: desiredRelay ?? this.desiredRelay,
      relayMode: relayMode ?? this.relayMode,
      firmwareVersion: firmwareVersion,
      wifiRssi: wifiRssi,
      ipAddress: ipAddress,
      uptimeSeconds: uptimeSeconds,
      lastSeen: lastSeen,
      status: status ?? this.status,
      secondsSinceSeen: secondsSinceSeen,
      offlineSince: offlineSince,
      apiKey: apiKey,
    );
  }
}
