import { z } from "zod";
import { requireEmailFields } from "../../sevdesk/schemas.js";

export const reminderDelivery = z.object({
  channel: z
    .enum(["email", "mark-sent"])
    .describe(
      "email sends via sevdesk and requires toEmail, subject, and text. mark-sent records the send type. Both lock the reminder; only use when the user asked to send or lock."
    ),
  toEmail: z.string().email().optional().describe("Required when channel=email."),
  subject: z
    .string()
    .min(1)
    .optional()
    .describe("Email subject. Required when channel=email. Do not use a placeholder."),
  text: z.string().min(1).optional().describe("Email body. Required when channel=email."),
  sendType: z
    .enum(["print", "postal", "email", "downloaded_pdf"])
    .optional()
    .describe("Used with channel=mark-sent."),
  sendXml: z.boolean().optional().describe("Attach the invoice XML when channel=email."),
  copy: z.boolean().optional(),
  ccEmail: z.union([z.string(), z.array(z.string())]).optional(),
  bccEmail: z.union([z.string(), z.array(z.string())]).optional(),
  additionalAttachments: z.union([z.string(), z.array(z.union([z.string(), z.number()]))]).optional()
});

export function mapReminderDelivery(delivery: z.infer<typeof reminderDelivery>) {
  if (delivery.channel === "email") {
    const email = requireEmailFields(delivery, "sevdesk_create_reminder");
    return {
      channel: "email" as const,
      toEmail: email.toEmail,
      subject: email.subject,
      text: email.text,
      ...(delivery.sendXml === undefined ? {} : { sendXml: delivery.sendXml }),
      ...(delivery.copy === undefined ? {} : { copy: delivery.copy }),
      ...(delivery.ccEmail === undefined ? {} : { ccEmail: delivery.ccEmail }),
      ...(delivery.bccEmail === undefined ? {} : { bccEmail: delivery.bccEmail }),
      ...(delivery.additionalAttachments === undefined
        ? {}
        : { additionalAttachments: delivery.additionalAttachments })
    };
  }
  return {
    channel: "mark-sent" as const,
    ...(delivery.sendType === undefined ? {} : { sendType: delivery.sendType })
  };
}
