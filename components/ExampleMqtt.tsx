"use client";

import { Button } from "@/components/ui/button";
import { useMqtt, useSubscribe } from "@/provider/MqttProvider";
import { zodResolver } from "@hookform/resolvers/zod";
import { SendIcon } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "react-toastify";
import { z } from "zod";
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "./ui/form";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";

const schema = z.object({
  topic: z.string(),
  message: z.string().min(1).max(150),
});

type FormValues = z.infer<typeof schema>;

export function ExampleMqtt() {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      topic: "",
      message: "",
    },
  });

  const length = form.watch("message").length;

  const { publish } = useMqtt();

  useSubscribe("#", (topic, message) => {
    toast.success(`received on '${topic}': ${message}`);
  });

  const onSubmit = (data: FormValues) => {
    publish(data.topic, data.message);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="topic"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Topic</FormLabel>
              <FormControl>
                <Input placeholder="foo/bar, testtopic/#, device/+/status" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="message"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Message</FormLabel>
              <FormControl>
                <Textarea placeholder="Can someone explain why..." {...field} />
              </FormControl>
              <FormDescription>
                {length}/{150}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">Publish <SendIcon/></Button>
      </form>
    </Form>
  );
}
