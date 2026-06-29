import type { ExpoConfig } from 'expo/config';

const IS_DEV = process.env['APP_VARIANT'] === 'development';

const config: ExpoConfig = {
  name: 'Spendspacey',
  slug: 'contas',
  version: '1.0.0',
  runtimeVersion: {
    policy: 'fingerprint',
  },
  orientation: 'portrait',
  icon: IS_DEV
    ? './assets/images/app-icon-dev/ios/AppIcon~ios-marketing.png'
    : './assets/images/app-icon/ios/AppIcon~ios-marketing.png',
  scheme: 'contas',
  userInterfaceStyle: 'dark',
  ios: {
    supportsTablet: true,
    bundleIdentifier: IS_DEV ? 'com.dnstld.contas.dev' : 'com.dnstld.contas',
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    adaptiveIcon: {
      backgroundColor: '#E6F4FE',
      foregroundImage: IS_DEV
        ? './assets/images/app-icon-dev/android/res/mipmap-xxxhdpi/ic_launcher_foreground.png'
        : './assets/images/app-icon/android/res/mipmap-xxxhdpi/ic_launcher_foreground.png',
      backgroundImage: IS_DEV
        ? './assets/images/app-icon-dev/android/res/mipmap-xxxhdpi/ic_launcher_background.png'
        : './assets/images/app-icon/android/res/mipmap-xxxhdpi/ic_launcher_background.png',
      monochromeImage: IS_DEV
        ? './assets/images/app-icon-dev/android/res/mipmap-xxxhdpi/ic_launcher_monochrome.png'
        : './assets/images/app-icon/android/res/mipmap-xxxhdpi/ic_launcher_monochrome.png',
    },
    predictiveBackGestureEnabled: false,
    package: IS_DEV ? 'com.dnstld.contas.dev' : 'com.dnstld.contas',
  },
  web: {
    output: 'static',
    favicon: './assets/images/app-icon/web/favicon.ico',
  },
  plugins: [
    './plugins/with-modular-headers',
    'expo-router',
    [
      'expo-splash-screen',
      {
        image: './assets/images/splash-icon.png',
        imageWidth: 200,
        resizeMode: 'contain',
        backgroundColor: '#2A76B5',
        dark: {
          backgroundColor: '#2A76B5',
        },
      },
    ],
    [
      'expo-font',
      {
        // iOS reads the family name ("Lato") and weight from each file's
        // metadata, so fontWeight maps automatically across these faces.
        ios: {
          fonts: [
            './assets/fonts/Lato-Light.ttf',
            './assets/fonts/Lato-Regular.ttf',
            './assets/fonts/Lato-Bold.ttf',
            './assets/fonts/Lato-Black.ttf',
          ],
        },
        // Android needs the weight mapping declared explicitly.
        android: {
          fonts: [
            {
              fontFamily: 'Lato',
              fontDefinitions: [
                { path: './assets/fonts/Lato-Light.ttf', weight: 300 },
                { path: './assets/fonts/Lato-Regular.ttf', weight: 400 },
                { path: './assets/fonts/Lato-Bold.ttf', weight: 700 },
                { path: './assets/fonts/Lato-Black.ttf', weight: 900 },
              ],
            },
          ],
        },
      },
    ],
    'expo-image',
    'expo-web-browser',
    'expo-localization',
    [
      '@react-native-google-signin/google-signin',
      {
        iosUrlScheme: 'com.googleusercontent.apps.59423241860-20pm8hjnm29sir3v86ta4t8u7koupuel',
      },
    ],
    [
      '@sentry/react-native/expo',
      {
        organization: 'contas',
        project: 'contas',
        url: 'https://de.sentry.io/',
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
  extra: {
    router: {},
    eas: {
      projectId: 'c017d12a-cdcb-4a64-b452-2ac399f833cb',
    },
  },
  owner: 'dnstld',
};

export default config;
