class SystemLog {
  final int id;
  final String? deviceId;
  final String event;
  final String logType; // 'info', 'action', 'mode', 'automation', 'notification', 'settings'
  final String status;
  final Map<String, dynamic> metadata;
  final String? createdAt;

  SystemLog({
    required this.id,
    this.deviceId,
    required this.event,
    required this.logType,
    required this.status,
    required this.metadata,
    this.createdAt,
  });

  factory SystemLog.fromJson(Map<String, dynamic> json) {
    return SystemLog(
      id: json['id'] ?? 0,
      deviceId: json['device_id'],
      event: json['event'] ?? '',
      logType: json['log_type'] ?? 'info',
      status: json['status'] ?? 'Active',
      metadata: json['metadata'] ?? {},
      createdAt: json['created_at'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'device_id': deviceId,
      'event': event,
      'log_type': logType,
      'status': status,
      'metadata': metadata,
      'created_at': createdAt,
    };
  }
}
