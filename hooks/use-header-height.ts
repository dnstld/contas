// SDK 56 dropped `@react-navigation/elements` as a directly-importable peer.
// expo-router still ships the implementation internally; re-export it through
// this wrapper so all consumers have one place to update if expo-router moves
// the path in a future SDK.
//
// See: docs.expo.dev/router/migrate/sdk-55-to-56
export { useHeaderHeight } from 'expo-router/build/react-navigation/elements/Header/useHeaderHeight';
