class Telemetry {
  final String deviceId;
  final String mode;
  final bool relay;
  final String relayMode;
  final SensorData sensorData;
  final String? lastUpdated;

  Telemetry({
    required this.deviceId,
    required this.mode,
    required this.relay,
    required this.relayMode,
    required this.sensorData,
    this.lastUpdated,
  });

  factory Telemetry.fromJson(Map<String, dynamic> json) {
    return Telemetry(
      deviceId: json['device_id'] ?? '',
      mode: json['mode'] ?? 'fall',
      relay: json['relay'] ?? false,
      relayMode: json['relay_mode'] ?? 'manual',
      sensorData: SensorData.fromJson(json['sensor_data'] ?? {}),
      lastUpdated: json['last_updated'] ?? json['timestamp'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'device_id': deviceId,
      'mode': mode,
      'relay': relay,
      'relay_mode': relayMode,
      'sensor_data': sensorData.toJson(),
      'last_updated': lastUpdated,
    };
  }
}

class SensorData {
  final bool presence;
  final int activity;
  final bool fallDetected;
  final SleepData? sleep;

  SensorData({
    required this.presence,
    required this.activity,
    required this.fallDetected,
    this.sleep,
  });

  factory SensorData.fromJson(Map<String, dynamic> json) {
    return SensorData(
      presence: json['presence'] ?? false,
      activity: json['activity'] ?? 0,
      fallDetected: json['fall_detected'] ?? false,
      sleep: json['sleep'] != null ? SleepData.fromJson(json['sleep']) : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'presence': presence,
      'activity': activity,
      'fall_detected': fallDetected,
      'sleep': sleep?.toJson(),
    };
  }
}

class SleepData {
  final int? heartRate;
  final int? respiration;
  final int? movement;
  final String? sleepState;
  final int? score;

  SleepData({
    this.heartRate,
    this.respiration,
    this.movement,
    this.sleepState,
    this.score,
  });

  factory SleepData.fromJson(Map<String, dynamic> json) {
    return SleepData(
      heartRate: json['heart_rate'],
      respiration: json['respiration'],
      movement: json['movement'],
      sleepState: json['sleep_state'] ?? json['state'],
      score: json['score'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'heart_rate': heartRate,
      'respiration': respiration,
      'movement': movement,
      'sleep_state': sleepState,
      'score': score,
    };
  }
}
