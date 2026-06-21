import { ConfigPlugin, withDangerousMod } from 'expo/config-plugins';
import fs from 'fs';
import path from 'path';

/**
 * Config plugin that adds :modular_headers => true for GoogleUtilities and
 * RecaptchaInterop in the generated Podfile.
 *
 * Required because AppCheckCore (pulled in by GoogleSignIn) is a Swift static
 * library that depends on these two Objective-C pods, and CocoaPods needs
 * module maps to import them from Swift.
 */
const withModularHeaders: ConfigPlugin = (config) => {
  return withDangerousMod(config, [
    'ios',
    (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');
      let contents = fs.readFileSync(podfilePath, 'utf8');

      const patch = [
        "  pod 'GoogleUtilities', :modular_headers => true",
        "  pod 'RecaptchaInterop', :modular_headers => true",
      ].join('\n');

      if (!contents.includes("pod 'GoogleUtilities', :modular_headers => true")) {
        contents = contents.replace('  use_expo_modules!', `  use_expo_modules!\n${patch}`);
        fs.writeFileSync(podfilePath, contents);
      }

      return config;
    },
  ]);
};

export default withModularHeaders;
