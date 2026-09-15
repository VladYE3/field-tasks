import NetInfo from '@react-native-community/netinfo';

export type Unsubscribe = () => void;

/** Subscribes to connectivity changes. The store uses this to trigger sync when the network returns. */
export function subscribeToConnectivity(onChange: (online: boolean) => void): Unsubscribe {
  const unsubscribe = NetInfo.addEventListener((state) => {
    onChange(state.isConnected === true && state.isInternetReachable !== false);
  });
  return unsubscribe;
}

export async function checkOnline(): Promise<boolean> {
  const state = await NetInfo.fetch();
  return state.isConnected === true;
}
