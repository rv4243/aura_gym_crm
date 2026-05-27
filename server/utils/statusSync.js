import Member from '../models/Member.js';
import { sendTemplateMessage } from './whatsapp.js';

export async function runWhatsAppAutomations() {
    try {
        const today = new Date();
        const currentYear = today.getFullYear();
        const currentMonth = today.getMonth() + 1; // 1-12
        const currentDate = today.getDate(); // 1-31

        // ─── 1. Birthday Wishes 🎂 ───
        const birthdayMembers = await Member.find({
            whatsappNotifications: true,
            dob: { $ne: null },
            lastBirthdayWishSentYear: { $lt: currentYear }
        });

        for (const member of birthdayMembers) {
            const memberDob = new Date(member.dob);
            if (memberDob.getMonth() + 1 === currentMonth && memberDob.getDate() === currentDate) {
                const template = process.env.META_WISH_TEMPLATE_NAME || 'birthday_wish';
                try {
                    await sendTemplateMessage(member.phone, template, [member.name]);
                    member.lastBirthdayWishSentYear = currentYear;
                    await member.save();
                    console.log(`[WhatsApp Birthday] Sent birthday wish to ${member.name}`);
                } catch (sendErr) {
                    console.error(`[WhatsApp Birthday Failed] for ${member.name}:`, sendErr.message);
                }
            }
        }

        // ─── 2. Joining Anniversary Wishes 🎗️ ───
        const anniversaryMembers = await Member.find({
            whatsappNotifications: true,
            joinDate: { $ne: null },
            lastAnniversaryWishSentYear: { $lt: currentYear }
        });

        for (const member of anniversaryMembers) {
            const memberJoin = new Date(member.joinDate);
            if (memberJoin.getMonth() + 1 === currentMonth && memberJoin.getDate() === currentDate) {
                const template = process.env.META_ANNIVERSARY_TEMPLATE_NAME || 'anniversary_wish';
                const years = currentYear - memberJoin.getFullYear();
                
                // Only send if it's at least 1 year
                if (years > 0) {
                    try {
                        await sendTemplateMessage(member.phone, template, [member.name, String(years)]);
                        member.lastAnniversaryWishSentYear = currentYear;
                        await member.save();
                        console.log(`[WhatsApp Anniversary] Sent ${years}-year wish to ${member.name}`);
                    } catch (sendErr) {
                        console.error(`[WhatsApp Anniversary Failed] for ${member.name}:`, sendErr.message);
                    }
                }
            }
        }

        // ─── 3. Payment Expiry Reminders (3 Days Before & Day of Expiry) ⏰ ───
        const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);

        // Three days from now
        const threeDaysLaterStart = new Date(startOfToday);
        threeDaysLaterStart.setDate(threeDaysLaterStart.getDate() + 3);
        const threeDaysLaterEnd = new Date(endOfToday);
        threeDaysLaterEnd.setDate(threeDaysLaterEnd.getDate() + 3);

        const expiringMembers = await Member.find({
            status: 'active',
            whatsappNotifications: true,
            expiryDate: { $ne: null }
        }).populate('planId');

        for (const member of expiringMembers) {
            const expiry = new Date(member.expiryDate);
            const template = process.env.META_REMINDER_TEMPLATE_NAME || 'payment_reminder';
            
            const isToday = expiry >= startOfToday && expiry <= endOfToday;
            const isThreeDays = expiry >= threeDaysLaterStart && expiry <= threeDaysLaterEnd;

            if (isToday || isThreeDays) {
                const lastSent = member.lastExpiryReminderSentDate;
                const sentToday = lastSent && 
                    lastSent.getFullYear() === today.getFullYear() &&
                    lastSent.getMonth() === today.getMonth() &&
                    lastSent.getDate() === today.getDate();

                if (!sentToday) {
                    try {
                        const daysLeft = isToday ? 'today' : '3 days';
                        const planName = member.planId?.name || 'membership';
                        const dateStr = expiry.toLocaleDateString();

                        await sendTemplateMessage(member.phone, template, [
                            member.name,
                            daysLeft,
                            planName,
                            dateStr
                        ]);

                        member.lastExpiryReminderSentDate = today;
                        await member.save();
                        console.log(`[WhatsApp Reminder] Sent reminder (${daysLeft}) to ${member.name}`);
                    } catch (sendErr) {
                        console.error(`[WhatsApp Reminder Failed] for ${member.name}:`, sendErr.message);
                    }
                }
            }
        }

    } catch (err) {
        console.error('[WhatsApp Automations] Failed execution:', err.message);
    }
}

export async function syncMemberStatuses() {
    try {
        const now = new Date();
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

        // 1. Members whose plans have expired (expiryDate is in the past) and are active -> update to 'paused'
        const toPause = await Member.updateMany(
            {
                status: 'active',
                expiryDate: { $ne: null, $lt: now }
            },
            {
                $set: { status: 'paused' }
            }
        );

        // 2. Members whose plans expired more than 1 month ago and are paused -> update to 'expired'
        const toExpire = await Member.updateMany(
            {
                status: 'paused',
                expiryDate: { $ne: null, $lt: oneMonthAgo }
            },
            {
                $set: { status: 'expired' }
            }
        );

        if (toPause.modifiedCount > 0 || toExpire.modifiedCount > 0) {
            console.log(`[Status Sync] Paused: ${toPause.modifiedCount} members, Expired: ${toExpire.modifiedCount} members`);
        }

        // Run WhatsApp automations daily alongside the status synchronization
        await runWhatsAppAutomations();

    } catch (err) {
        console.error('[Status Sync] Failed to synchronize statuses:', err.message);
    }
}
