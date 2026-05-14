import { useState } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, View } from 'react-native';

import * as SwiftUI from '@expo/ui/swift-ui';
import * as Compose from '@expo/ui/jetpack-compose';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function UiDemoScreen() {
  const [toggleOn, setToggleOn] = useState(false);
  const [sliderValue, setSliderValue] = useState(0.5);
  const [textValue, setTextValue] = useState('');
  const [pressCount, setPressCount] = useState(0);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <ThemedView style={styles.header}>
        <ThemedText type="title">@expo/ui Demo</ThemedText>
        <ThemedText>
          {Platform.OS === 'ios'
            ? 'Rendered with SwiftUI on iOS.'
            : 'Rendered with Jetpack Compose on Android.'}
        </ThemedText>
      </ThemedView>

      <Row label="Toggle / Switch" value={toggleOn ? 'On' : 'Off'}>
        {Platform.OS === 'ios' ? (
          <SwiftUI.Host matchContents>
            <SwiftUI.Toggle
              label="Enable feature"
              isOn={toggleOn}
              onIsOnChange={setToggleOn}
            />
          </SwiftUI.Host>
        ) : (
          <Compose.Host matchContents>
            <Compose.Switch value={toggleOn} onCheckedChange={setToggleOn} />
          </Compose.Host>
        )}
      </Row>

      <Row label="Slider" value={sliderValue.toFixed(2)}>
        {Platform.OS === 'ios' ? (
          <SwiftUI.Host matchContents={{ vertical: true }} style={styles.fullWidth}>
            <SwiftUI.Slider
              value={sliderValue}
              min={0}
              max={1}
              onValueChange={setSliderValue}
            />
          </SwiftUI.Host>
        ) : (
          <Compose.Host matchContents={{ vertical: true }} style={styles.fullWidth}>
            <Compose.Slider
              value={sliderValue}
              min={0}
              max={1}
              onValueChange={setSliderValue}
            />
          </Compose.Host>
        )}
      </Row>

      <Row label="Button" value={`Pressed ${pressCount} time(s)`}>
        {Platform.OS === 'ios' ? (
          <SwiftUI.Host matchContents>
            <SwiftUI.Button
              label="Tap me"
              systemImage="hand.tap"
              onPress={() => {
                setPressCount((n) => n + 1);
                Alert.alert('Pressed', 'SwiftUI Button');
              }}
            />
          </SwiftUI.Host>
        ) : (
          <Compose.Host matchContents>
            <Compose.Button
              onClick={() => {
                setPressCount((n) => n + 1);
                Alert.alert('Pressed', 'Compose Button');
              }}>
              Tap me
            </Compose.Button>
          </Compose.Host>
        )}
      </Row>

      <Row label="TextField" value={textValue || '(empty)'}>
        {Platform.OS === 'ios' ? (
          <SwiftUI.Host matchContents={{ vertical: true }} style={styles.fullWidth}>
            <SwiftUI.TextField
              placeholder="Type something"
              defaultValue=""
              onValueChange={setTextValue}
            />
          </SwiftUI.Host>
        ) : (
          <Compose.Host matchContents={{ vertical: true }} style={styles.fullWidth}>
            <Compose.TextField
              defaultValue=""
              singleLine
              onValueChange={setTextValue}>
              <Compose.TextField.Placeholder>
                Type something
              </Compose.TextField.Placeholder>
            </Compose.TextField>
          </Compose.Host>
        )}
      </Row>
    </ScrollView>
  );
}

function Row({
  label,
  value,
  children,
}: {
  label: string;
  value: string;
  children: React.ReactNode;
}) {
  return (
    <ThemedView style={styles.row}>
      <ThemedText type="subtitle">{label}</ThemedText>
      <View style={styles.control}>{children}</View>
      <ThemedText style={styles.value}>State: {value}</ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingTop: 64,
    gap: 20,
  },
  header: {
    gap: 4,
  },
  row: {
    gap: 8,
  },
  control: {
    minHeight: 44,
    justifyContent: 'center',
  },
  fullWidth: {
    alignSelf: 'stretch',
  },
  value: {
    opacity: 0.7,
  },
});
