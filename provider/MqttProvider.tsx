import mqtt, { type MqttClient } from "mqtt";
import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useRef,
} from "react";
import { toast } from "react-toastify";

type OnMessageCallback = (message: string, topic: string) => void;

type MqttProviderProps = {
  subscribe: (topic: string, callback: OnMessageCallback) => void;
  publish: (topic: string, message: string) => void;
};

const MqttContext = createContext({} as MqttProviderProps);

export function MqttProvider(props: PropsWithChildren) {
  const client = useRef<MqttClient | null>(null);
  const subscriptions = useRef<Record<string, OnMessageCallback>>({});

  const subscribe = useCallback(
    (topic: string, callback: OnMessageCallback) => {
      client.current?.subscribe(topic);
      subscriptions.current[topic] = callback;

      return () => {
        client.current?.unsubscribe(topic);
      };
    },
    [],
  );

  const publish = useCallback((topic: string, message: boolean | number | string | Record<string, unknown>) => {
    const messageToSend = typeof message === "string" ? message : JSON.stringify(message);
    client.current?.publish(topic, messageToSend);
  }, []);

  useEffect(() => {
    if (client.current) return;

    client.current = mqtt.connect({
      // clientId: "YOUR_UNIQUE_CLIENT_ID",
      username: process.env.NEXT_PUBLIC_MQTT_USERNAME,
      password: process.env.NEXT_PUBLIC_MQTT_PASSWORD,
      hostname: process.env.NEXT_PUBLIC_MQTT_SERVER_HOSTNAME,
      port: Number(process.env.NEXT_PUBLIC_MQTT_WS_PORT),
      protocol: "ws",
      path: "/mqtt",
    });

    client.current
      .on("connect", () => {
        toast.success("Connected to MQTT broker!");
        Object.entries(subscriptions.current).forEach(([topic, callback]) =>
          subscribe(topic, callback),
        );
      })
      .on("reconnect", () => {
        toast.warning("Reconnecting to MQTT broker...");
        Object.entries(subscriptions.current).forEach(([topic, callback]) =>
          subscribe(topic, callback),
        );
      })
      .on("error", (error) => {
        toast.error(error.message);
      })
      .on("message", (topic, message) => {
        // TODO: implement wildcard subscriptions (e.g. "devices/+/status" or "devices/#")
        const callback = subscriptions.current[topic];

        callback?.(message.toString(), topic);
      });
  }, [subscribe]);

  return (
    <MqttContext.Provider value={{ subscribe, publish }}>
      {props.children}
    </MqttContext.Provider>
  );
}

export function useMqtt() {
  return useContext(MqttContext);
}

export function useSubscribe(topic: string, callback: OnMessageCallback) {
  const { subscribe } = useMqtt();

  useEffect(() => subscribe(topic, callback), [subscribe, topic, callback]);
}
