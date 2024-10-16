'use client'

import { PropsWithChildren } from 'react';
import { MqttProvider } from './MqttProvider';

export function Providers(props: PropsWithChildren) {
  // localStorage.debug = "mqttjs*"; // For debugging MQTT client

  return (
    <MqttProvider>
      {props.children}
    </MqttProvider>
  )
}
