# React Native Mobile App - Employees App

A fully functional React Native mobile application converted from the existing Vite + React web application.

## Migration Summary

| Web (Vite + React) | Mobile (React Native + Expo) |
|--------------------|------------------------------|
| Tailwind CSS v4 | NativeWind (Tailwind for RN) |
| React Router v7 | React Navigation v7 |
| localStorage | AsyncStorage |
| Browser APIs | Platform-specific APIs |
| HTML elements | React Native components |
| CSS files | StyleSheet / Tailwind |

## Project Structure

```
EmployeesApp/
├── App.jsx                      # Main app with navigation
├── app.json                     # Expo configuration
├── eas.json                     # EAS Build config
├── babel.config.js              # Babel with NativeWind
├── metro.config.js              # Metro bundler config
├── tailwind.config.js           # Tailwind configuration
├── global.css                   # Tailwind imports
├── assets/                      # Images, icons
└── src/
    ├── api/
    │   └── api.js              # Axios API service (converted)
    ├── context/
    │   └── AuthContext.jsx      # Auth with AsyncStorage (converted)
    ├── screens/
    │   ├── LoginScreen.jsx     # Login (converted)
    │   ├── DashboardScreen.jsx # Dashboard (converted)
    │   ├── AttendanceScreen.jsx# Attendance (converted)
    │   ├── BillingScreen.jsx   # Billing (converted)
    │   ├── ExpenseScreen.jsx   # Expense (converted)
    │   ├── ProfileScreen.jsx   # Profile (converted)
    │   └── HistoryScreen.jsx   # History (converted)
    ├── navigation/
    │   └── AppNavigator.jsx   # Navigation setup
    └── utils/
        └── helpers.js          # Utility functions
```

## Component Conversion Guide

### HTML to React Native

| Web Component | React Native |
|--------------|--------------|
| `<div>` | `<View>` |
| `<span>` / `<p>` | `<Text>` |
| `<button>` | `<TouchableOpacity>` |
| `<input>` | `<TextInput>` |
| `<select>` | `<Picker>` or custom |
| `<form>` | `<View>` + handlers |
| `<img>` | `<Image>` |
| `<a href>` | `<TouchableOpacity> + Linking` |
| `<ul>` / `<ol>` | `<FlatList>` or `<ScrollView>` |
| `<table>` | `<View>` rows |
| `<scroll>` | `<ScrollView>` |
| `<flexbox>` | `<View style={flexStyle}>` |

### Styling Conversion

```javascript
// Web (Tailwind)
<div className="flex flex-row items-center justify-between p-4 bg-white rounded-xl shadow-md">

// Mobile (NativeWind - same classes!)
<View className="flex flex-row items-center justify-between p-4 bg-white rounded-xl shadow-md">

// For custom styles
<View style={StyleSheet.create({ container: { flex: 1, padding: 16 } })} />
```

### localStorage to AsyncStorage

```javascript
// Web - localStorage
localStorage.setItem('token', token);
localStorage.getItem('token');
localStorage.removeItem('token');

// Mobile - AsyncStorage (async)
import AsyncStorage from '@react-native-async-storage/async-storage';

await AsyncStorage.setItem('token', token);
const token = await AsyncStorage.getItem('token');
await AsyncStorage.removeItem('token');
```

### Navigation Conversion

```javascript
// Web - React Router
<Route path="/login" element={<Login />} />
<Link to="/dashboard">Go to Dashboard</Link>
const navigate = useNavigate();
navigate('/dashboard');

// Mobile - React Navigation
<Stack.Screen name="Login" component={LoginScreen} />
<Button onPress={() => navigation.navigate('Dashboard')} />

// Screen props
const { navigation } = props;
// or
const navigation = useNavigation();
navigation.navigate('ScreenName');
```

### Form Handling

```javascript
// Web - React controlled inputs
const [value, setValue] = useState('');
<input value={value} onChange={(e) => setValue(e.target.value)} />

// Mobile - Same pattern
const [value, setValue] = useState('');
<TextInput value={value} onChangeText={setValue} />
```

## Setup Instructions

### Prerequisites

- Node.js 18+
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- Expo Go app (for testing on device)
- Android Studio (for Android emulator)
- Xcode (for iOS simulator, macOS only)

### Installation

```bash
# Navigate to project directory
cd EmployeesApp

# Install dependencies
npm install

# Start development server
npm start
```

### Running the App

```bash
# Start Expo (opens browser/CLI)
npm start

# Run on Android Emulator
npm run android

# Run on iOS Simulator
npm run ios

# Run on Physical Device
# 1. Install Expo Go from App Store/Play Store
# 2. Scan QR code from npm start
```

## Building APK

### Development Build (Faster)

```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Configure project (first time)
eas build:configure

# Build for Android
eas build -p android --profile preview
```

### Production Build

```bash
# Set up credentials for Play Store (if needed)
eas credentials --platform android

# Build production APK
eas build -p android --profile production
```

### Local Build with Gradle

```bash
# Generate native Android project
npx expo prebuild --platform android

# Navigate to android folder
cd android

# Build debug APK
./gradlew assembleDebug

# APK will be at: android/app/build/outputs/apk/debug/app-debug.apk
```

## API Configuration

Update the API URL in `src/api/api.js`:

```javascript
const API_URL = 'http://YOUR_SERVER_IP:5000/api';
```

For development, use your computer's local IP address instead of `localhost`.

## Key Features Implemented

### 1. Authentication
- Phone + Password login
- JWT token storage (AsyncStorage)
- Auto-login on app restart
- Logout functionality

### 2. Location Services
- Check-in/Check-out with geolocation
- Expo Location API integration
- Permission handling

### 3. Dashboard
- Today's stats (revenue, services)
- Quick action cards
- Pull-to-refresh

### 4. Billing
- Customer search
- Walk-in support
- Multi-step invoice creation
- Service selection with quantities
- Payment method selection

### 5. Attendance
- Real-time check-in/out
- Attendance history
- Duration calculation

### 6. Expense Tracking
- Form validation
- Multiple payment modes
- Notes support

## Platform-Specific Considerations

### Android
- Safe area handling via `SafeAreaView`
- Back button handling
- Status bar styling
- Hardware back button navigation

### iOS
- Notch handling
- Home indicator area
- Safe area insets

## Performance Tips

1. **Use FlatList** for long lists instead of ScrollView
2. **Memoize components** with `React.memo()`
3. **Use useCallback/useMemo** for expensive operations
4. **Optimize images** - use appropriate sizes
5. **Avoid anonymous functions** in render

## Troubleshooting

### Metro Bundler Issues
```bash
# Clear cache
npx react-native start --reset-cache
```

### Build Issues
```bash
# Clean and rebuild
npx expo prebuild --clean
npm install
```

### AsyncStorage Issues
```javascript
// Always use try-catch
try {
  await AsyncStorage.setItem('key', value);
} catch (error) {
  console.error('Storage error:', error);
}
```

## Next Steps

1. [ ] Add push notifications
2. [ ] Implement offline support
3. [ ] Add biometric authentication
4. [ ] Implement deep linking
5. [ ] Add analytics
6. [ ] Implement app updates

## Support

For issues or questions, create an issue in the repository.
