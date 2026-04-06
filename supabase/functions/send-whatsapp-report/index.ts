type AppStateRow = {
  data?: {
    days?: Record<string, { transactions?: TransactionRecord[] }>;
  };
};

type TransactionRecord = {
  type: "sale" | "expense";
  title: string;
  amount: number;
  paymentType: "cash" | "pos" | "bank" | "-";
  createdAt: string;
};

type ReportSettingsRow = {
  app_id: string;
  phone_number: string;
  send_time: string;
  report_type: "daily_summary" | "daily_with_top_products";
  is_enabled: boolean;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const mode = body.mode ?? "manual";
    const appId = body.app_id;
    const timezone = Deno.env.get("APP_TIMEZONE") ?? "Europe/Istanbul";

    if (!appId) {
      return jsonResponse({ error: "app_id gerekli." }, 400);
    }

    const supabaseUrl = requireEnv("SUPABASE_URL");
    const serviceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
    const whatsAppToken = requireEnv("WHATSAPP_ACCESS_TOKEN");
    const whatsAppPhoneNumberId = requireEnv("WHATSAPP_PHONE_NUMBER_ID");
    const whatsAppTemplateName = Deno.env.get("WHATSAPP_TEMPLATE_NAME") ?? "";
    const whatsAppTemplateLanguage = Deno.env.get("WHATSAPP_TEMPLATE_LANGUAGE") ?? "tr";

    const settings = await fetchSingle<ReportSettingsRow>(
      `${supabaseUrl}/rest/v1/report_settings?app_id=eq.${encodeURIComponent(appId)}&select=*`,
      serviceRoleKey,
    );

    if (!settings) {
      return jsonResponse({ error: "report_settings bulunamadi." }, 404);
    }

    if (mode !== "test" && !settings.is_enabled) {
      return jsonResponse({ skipped: true, reason: "Rapor pasif." });
    }

    const reportDate = body.report_date ?? getReportDate(timezone);

    if (mode === "scheduled") {
      const currentTime = getCurrentTimeString(timezone);
      if (currentTime !== settings.send_time) {
        return jsonResponse({ skipped: true, reason: "Saat eslesmedi." });
      }

      const alreadySent = await fetchSingle(
        `${supabaseUrl}/rest/v1/report_logs?app_id=eq.${encodeURIComponent(appId)}&report_date=eq.${reportDate}&mode=eq.scheduled&status=eq.sent&select=id`,
        serviceRoleKey,
      );

      if (alreadySent) {
        return jsonResponse({ skipped: true, reason: "Bu tarih icin rapor zaten gonderildi." });
      }
    }

    const appState = await fetchSingle<AppStateRow>(
      `${supabaseUrl}/rest/v1/app_state?app_id=eq.${encodeURIComponent(appId)}&select=data`,
      serviceRoleKey,
    );

    const transactions = appState?.data?.days?.[reportDate]?.transactions ?? [];
    const reportText = buildReportMessage(reportDate, transactions, settings.report_type);

    await sendWhatsAppText({
      phoneNumberId: whatsAppPhoneNumberId,
      accessToken: whatsAppToken,
      to: mode === "test" && body.phone_number ? body.phone_number : settings.phone_number,
      body: reportText,
      templateName: whatsAppTemplateName,
      templateLanguage: whatsAppTemplateLanguage,
    });

    await writeLog({
      supabaseUrl,
      serviceRoleKey,
      payload: {
        app_id: appId,
        report_date: reportDate,
        mode,
        status: "sent",
        detail: `Rapor ${mode} modunda gonderildi.`,
      },
    });

    return jsonResponse({ ok: true, report_date: reportDate });
  } catch (error) {
    console.error(error);
    return jsonResponse({ error: String(error) }, 500);
  }
});

function buildReportMessage(
  reportDate: string,
  transactions: TransactionRecord[],
  reportType: "daily_summary" | "daily_with_top_products",
) {
  const sales = transactions.filter((item) => item.type === "sale");
  const expenses = transactions.filter((item) => item.type === "expense");

  const totalRevenue = sumAmounts(sales);
  const totalExpense = sumAmounts(expenses);
  const cashSales = sumAmounts(sales.filter((item) => item.paymentType === "cash"));
  const bankSales = sumAmounts(sales.filter((item) => item.paymentType === "pos"));
  const cashExpenses = sumAmounts(expenses.filter((item) => item.paymentType === "cash"));
  const bankExpenses = sumAmounts(expenses.filter((item) => item.paymentType === "bank"));

  const lines = [
    `Gun Sonu Raporu - ${reportDate}`,
    "",
    `Total Ciro: ${formatCurrency(totalRevenue)}`,
    `Nakit Kasa: ${formatCurrency(cashSales - cashExpenses)}`,
    `Banka Kasasi: ${formatCurrency(bankSales - bankExpenses)}`,
    `Toplam Gider: ${formatCurrency(totalExpense)}`,
    `Net Kasa: ${formatCurrency(totalRevenue - totalExpense)}`,
  ];

  if (reportType === "daily_with_top_products") {
    const grouped = Object.values(
      sales.reduce<Record<string, { title: string; count: number }>>((accumulator, item) => {
        if (!accumulator[item.title]) {
          accumulator[item.title] = { title: item.title, count: 0 };
        }

        accumulator[item.title].count += 1;
        return accumulator;
      }, {}),
    )
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    lines.push("", "En Cok Satanlar:");

    if (grouped.length === 0) {
      lines.push("- Satis yok");
    } else {
      grouped.forEach((item) => {
        lines.push(`- ${item.title}: ${item.count} adet`);
      });
    }
  }

  return lines.join("\n");
}

async function sendWhatsAppText(input: {
  phoneNumberId: string;
  accessToken: string;
  to: string;
  body: string;
  templateName?: string;
  templateLanguage?: string;
}) {
  const requestBody = input.templateName
    ? {
        messaging_product: "whatsapp",
        to: input.to,
        type: "template",
        template: {
          name: input.templateName,
          language: {
            code: input.templateLanguage ?? "tr",
          },
          components: [
            {
              type: "body",
              parameters: [
                {
                  type: "text",
                  text: input.body,
                },
              ],
            },
          ],
        },
      }
    : {
        messaging_product: "whatsapp",
        to: input.to,
        type: "text",
        text: {
          body: input.body,
        },
      };

  const response = await fetch(`https://graph.facebook.com/v23.0/${input.phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`WhatsApp gonderimi basarisiz: ${response.status} ${errorText}`);
  }
}

async function fetchSingle<T>(url: string, apiKey: string): Promise<T | null> {
  const response = await fetch(url, {
    headers: {
      apikey: apiKey,
      Authorization: `Bearer ${apiKey}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Supabase sorgusu basarisiz: ${response.status}`);
  }

  const rows = await response.json();
  return rows[0] ?? null;
}

async function writeLog(input: {
  supabaseUrl: string;
  serviceRoleKey: string;
  payload: Record<string, string>;
}) {
  await fetch(`${input.supabaseUrl}/rest/v1/report_logs`, {
    method: "POST",
    headers: {
      apikey: input.serviceRoleKey,
      Authorization: `Bearer ${input.serviceRoleKey}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify([input.payload]),
  });
}

function requireEnv(name: string) {
  const value = Deno.env.get(name);
  if (!value) {
    throw new Error(`${name} tanimli degil.`);
  }

  return value;
}

function sumAmounts(items: TransactionRecord[]) {
  return items.reduce((sum, item) => sum + Number(item.amount || 0), 0);
}

function getReportDate(timezone: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function getCurrentTimeString(timezone: string) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 2,
  }).format(value);
}

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}
