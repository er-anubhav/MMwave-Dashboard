import 'package:flutter/material.dart';
import 'glass_card.dart';

class RelayControl extends StatelessWidget {
  final bool relay;
  final String relayMode;
  final Function(bool state, String mode) onChanged;
  final bool isLoading;

  const RelayControl({
    Key? key,
    required this.relay,
    required this.relayMode,
    required this.onChanged,
    this.isLoading = false,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final isAuto = relayMode == 'auto';

    return GlassCard(
      borderColor: isAuto ? const Color(0xFF408A71).withOpacity(0.6) : null,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Relay Control',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 16,
                      fontWeight: FontWeight.normal,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    isAuto ? 'Automation Mode Active' : 'Manual Mode Active',
                    style: TextStyle(
                      color: isAuto ? const Color(0xFFA7DEC5) : const Color(0xFF9CAAA2),
                      fontSize: 12,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ],
              ),
              if (isLoading)
                const SizedBox(
                  width: 20,
                  height: 20,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    valueColor: AlwaysStoppedAnimation<Color>(Color(0xFFA7DEC5)),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                child: InkWell(
                  onTap: isLoading
                      ? null
                      : () => onChanged(relay, isAuto ? 'manual' : 'auto'),
                  borderRadius: BorderRadius.circular(4.0),
                  child: Container(
                    padding: const EdgeInsets.symmetric(vertical: 10),
                    decoration: BoxDecoration(
                      color: isAuto ? const Color(0xFF408A71) : Colors.transparent,
                      borderRadius: BorderRadius.circular(4.0),
                      border: Border.all(
                        color: isAuto ? const Color(0xFF408A71) : const Color(0xFF1F3B2D),
                      ),
                    ),
                    child: Center(
                      child: Text(
                        'AUTO',
                        style: TextStyle(
                          color: isAuto ? Colors.white : const Color(0xFF9CAAA2),
                          fontWeight: FontWeight.normal,
                          fontSize: 13,
                        ),
                      ),
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: InkWell(
                  onTap: isLoading
                      ? null
                      : () => onChanged(relay, 'manual'),
                  borderRadius: BorderRadius.circular(4.0),
                  child: Container(
                    padding: const EdgeInsets.symmetric(vertical: 10),
                    decoration: BoxDecoration(
                      color: !isAuto ? const Color(0xFF1E362A) : Colors.transparent,
                      borderRadius: BorderRadius.circular(4.0),
                      border: Border.all(
                        color: !isAuto ? const Color(0xFF1F3B2D) : const Color(0xFF1E362A),
                      ),
                    ),
                    child: Center(
                      child: Text(
                        'MANUAL',
                        style: TextStyle(
                          color: !isAuto ? Colors.white : const Color(0xFF9CAAA2),
                          fontWeight: FontWeight.normal,
                          fontSize: 13,
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          // Relay Switch (Disabled in Auto Mode)
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.black.withOpacity(0.2),
              borderRadius: BorderRadius.zero,
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    Icon(
                      Icons.power,
                      color: relay ? const Color(0xFFA7DEC5) : const Color(0xFF9CAAA2),
                      size: 20,
                    ),
                    const SizedBox(width: 8),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Switch State: ${relay ? 'ON' : 'OFF'}',
                          style: TextStyle(
                            color: relay ? const Color(0xFFA7DEC5) : Colors.white,
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        if (isAuto)
                          const Text(
                            'Controlled by automations',
                            style: TextStyle(
                              color: Color(0xFF9CAAA2),
                              fontSize: 11,
                            ),
                          ),
                      ],
                    ),
                  ],
                ),
                Switch(
                  value: relay,
                  activeColor: const Color(0xFFA7DEC5),
                  inactiveThumbColor: const Color(0xFF9CAAA2),
                  inactiveTrackColor: const Color(0xFF13261C),
                  onChanged: (isAuto || isLoading)
                      ? null
                      : (val) => onChanged(val, 'manual'),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
