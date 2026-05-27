/**
 * Sends a WhatsApp Template message using Meta's Cloud API.
 * If credentials are not set in .env, it runs in dry-run mode and prints logs to the console.
 *
 * @param {string} toPhone - Recipient phone number (with country code, e.g. "919876543210")
 * @param {string} templateName - The approved template name in Meta (e.g. "payment_receipt")
 * @param {Array<string>} parameters - Values for placeholders {{1}}, {{2}}, etc.
 */
export async function sendTemplateMessage(toPhone, templateName, parameters) {
    const accessToken = process.env.META_ACCESS_TOKEN;
    const phoneId = process.env.META_PHONE_NUMBER_ID;

    // Clean phone number: keep only numbers
    const cleanPhone = toPhone.replace(/\D/g, '');

    if (!cleanPhone) {
        console.warn('[WhatsApp Error] Invalid phone number provided');
        return { status: 'error', message: 'Invalid phone number' };
    }

    // Check if configuration exists
    if (!accessToken || !phoneId) {
        console.log(`[WhatsApp Dry-Run] To: +${cleanPhone} | Template: ${templateName} | Params:`, parameters);
        return { status: 'dry_run', message: 'Credentials missing, logged to console.' };
    }

    const url = `https://graph.facebook.com/v19.0/${phoneId}/messages`;
    
    const componentParameters = parameters.map(value => ({
        type: 'text',
        text: String(value)
    }));

    const body = {
        messaging_product: 'whatsapp',
        to: cleanPhone,
        type: 'template',
        template: {
            name: templateName,
            language: { code: 'en_US' },
            components: [
                {
                    type: 'body',
                    parameters: componentParameters
                }
            ]
        }
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });

        const data = await response.json();
        
        if (!response.ok) {
            console.error('[WhatsApp API Error] Response status:', response.status, data);
            throw new Error(data.error?.message || 'Meta API Error');
        }

        console.log(`[WhatsApp Sent] Phone: +${cleanPhone} | Template: ${templateName}`);
        return { status: 'success', data };
    } catch (err) {
        console.error(`[WhatsApp Failure] Failed to send message to +${cleanPhone}:`, err.message);
        throw err;
    }
}
