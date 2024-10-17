import mqtt, { type MqttClient } from "mqtt";
import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useRef,
} from "react";
import { toast } from "sonner";

// Could also be `mqtt.OnMessageCallback`
// if you want to pass the raw payload and packet
// to the callback
type OnMessageCallback = (topic: string, message: string) => void;

type MqttProviderProps = {
  subscribe: (topic: string, callback: OnMessageCallback) => void;
  publish: (topic: string, message: string) => void;
};

const MqttContext = createContext({} as MqttProviderProps);

export function MqttProvider(props: PropsWithChildren) {
  const client = useRef<MqttClient | null>(null);
  const subscriptions = useRef<Map<string, OnMessageCallback>>(new Map());

  const subscribe = useCallback(
    (topic: string, callback: OnMessageCallback) => {
      client.current?.subscribe(topic);
      subscriptions.current.set(topic, callback);

      return () => {
        client.current?.unsubscribe(topic);
      };
    },
    [],
  );

  const publish = useCallback(
    (
      topic: string,
      message: boolean | number | string | Record<string, unknown>,
    ) => {
      const messageToSend =
        typeof message === "string" ? message : JSON.stringify(message);
      client.current?.publish(topic, messageToSend);
    },
    [],
  );

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
        Array.from(subscriptions.current.entries()).forEach(([topic, callback]) =>
          subscribe(topic, callback),
        );
      })
      .on("reconnect", () => {
        toast.warning("Reconnecting to MQTT broker...");
        Array.from(subscriptions.current.entries()).forEach(([topic, callback]) =>
          subscribe(topic, callback),
        );
      })
      .on("error", (error) => {
        toast.error(error.message);
      })
      .on("message", (topic, payload, packet) => {
        Array.from(subscriptions.current.keys()).forEach((subscription) => {
          const regexp = new RegExp(
            subscription.replace(/\+/g, "\\S+").replace(/#/, "\\S+"),
          );

          if (!topic.match(regexp)) {
            return;
          }

          const callback = subscriptions.current.get(subscription);

          if (!callback) {
            return;
          }

          try {
            callback(topic, payload.toString());
          } catch {
            console.error("Error in callback for topic", {
              topic,
              subscription,
              packet
            });
          }
        });
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
