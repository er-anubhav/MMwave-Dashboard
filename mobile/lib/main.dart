import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:google_fonts/google_fonts.dart';
import 'providers/auth_provider.dart';
import 'providers/device_provider.dart';
import 'screens/login_screen.dart';
import 'screens/main_navigation.dart';

void main() {
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider<AuthProvider>(
          create: (_) => AuthProvider(),
        ),
        ChangeNotifierProxyProvider<AuthProvider, DeviceProvider>(
          create: (context) => DeviceProvider(
            Provider.of<AuthProvider>(context, listen: false).apiClient,
          ),
          update: (context, auth, previousDeviceProvider) {
            // Update device provider client if session resets
            return previousDeviceProvider ?? DeviceProvider(auth.apiClient);
          },
        ),
      ],
      child: MaterialApp(
        title: 'LYFSense',
        debugShowCheckedModeBanner: false,
        theme: ThemeData(
          useMaterial3: true,
          brightness: Brightness.dark,
          textTheme: GoogleFonts.montserratTextTheme(ThemeData.dark().textTheme),
          colorScheme: const ColorScheme.dark(
            primary: Color(0xFFA7DEC5), // Primary mint
            secondary: Color(0xFF408A71), // Secondary forest
            surface: Color(0xFF13261C), // Card bg (HSL 160 30% 12%)
            background: Color(0xFF0B1410), // Background (HSL 160 30% 6%)
            error: Color(0xFF7F1D1D), // Destructive (HSL 0 62.8% 30.6%)
          ),
          scaffoldBackgroundColor: const Color(0xFF0B1410),
          appBarTheme: const AppBarTheme(
            backgroundColor: Color(0xFF13261C),
            elevation: 0,
            centerTitle: false,
            titleTextStyle: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.normal,
              color: Colors.white,
            ),
          ),
          cardTheme: const CardThemeData(
            color: Color(0xFF13261C),
            elevation: 0,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.zero,
              side: BorderSide(color: Color(0xFF1F3B2D)),
            ),
          ),
          dialogTheme: const DialogThemeData(
            backgroundColor: Color(0xFF13261C),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.zero,
              side: BorderSide(color: Color(0xFF1F3B2D)),
            ),
          ),
          elevatedButtonTheme: ElevatedButtonThemeData(
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFFA7DEC5),
              foregroundColor: const Color(0xFF0B1410),
              elevation: 0,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(4.0),
              ),
            ),
          ),
          outlinedButtonTheme: OutlinedButtonThemeData(
            style: OutlinedButton.styleFrom(
              elevation: 0,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(4.0),
              ),
            ),
          ),
          inputDecorationTheme: const InputDecorationTheme(
            filled: true,
            fillColor: Color(0xFF0B1410),
            labelStyle: TextStyle(color: Color(0xFF9CAAA2)),
            hintStyle: TextStyle(color: Color(0xFF9CAAA2)),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.zero,
              borderSide: BorderSide(color: Color(0xFF1F3B2D)),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.zero,
              borderSide: BorderSide(color: Color(0xFF1F3B2D)),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.zero,
              borderSide: BorderSide(color: Color(0xFFA7DEC5)),
            ),
          ),
        ),
        home: const AppRouter(),
      ),
    );
  }
}

class AppRouter extends StatelessWidget {
  const AppRouter({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final authProvider = Provider.of<AuthProvider>(context);

    if (authProvider.isLoading) {
      return const Scaffold(
        backgroundColor: Color(0xFF0B1410),
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                Icons.radar,
                size: 64,
                color: Color(0xFFA7DEC5),
              ),
              SizedBox(height: 16),
              CircularProgressIndicator(
                valueColor: AlwaysStoppedAnimation<Color>(Color(0xFFA7DEC5)),
              ),
            ],
          ),
        ),
      );
    }

    if (authProvider.isAuthenticated) {
      return const MainNavigationScreen();
    }

    return const LoginScreen();
  }
}
