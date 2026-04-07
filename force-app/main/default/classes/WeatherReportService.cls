public with sharing class WeatherReportService {
    private static final Integer MAX_RECIPIENTS_PER_EMAIL = 100;

    public class WeatherReportException extends Exception {
    }

    public static WeatherController.SendReportResult sendWeatherReport(
        Id recordId,
        List<Id> selectedRecipientIds,
        String reportText,
        String resolvedLocation,
        String condition,
        String temperature,
        String humidity,
        String windSpeed
    ) {
        String plainTextBody = String.isBlank(reportText)
            ? 'Weather report is unavailable for the selected location.'
            : reportText.trim();
        String htmlBody = buildHtmlBody(resolvedLocation, condition, temperature, humidity, windSpeed, plainTextBody);

        List<String> recipients = recordId != null
            ? getContactEmails(recordId, selectedRecipientIds)
            : getOrgUserEmails(selectedRecipientIds);
        if (recipients.isEmpty()) {
            throw new WeatherReportException(
                recordId != null
                    ? 'No related contacts with email addresses were found for this Account.'
                    : 'No active org users with email addresses were found.'
            );
        }

        sendEmails(recipients, buildSubject(resolvedLocation), plainTextBody, htmlBody);

        Datetime sentDate = System.now();
        updateSentDate(recordId, sentDate);

        WeatherController.SendReportResult result = new WeatherController.SendReportResult();
        result.recipientCount = recipients.size();
        result.recipientType = recordId != null ? 'contacts' : 'org users';
        result.sentDate = sentDate;
        return result;
    }

    public static List<WeatherController.RecipientOption> getAccountContacts(Id accountId) {
        if (accountId == null) {
            throw new WeatherReportException('An Account is required to load related contacts.');
        }

        List<WeatherController.RecipientOption> options = new List<WeatherController.RecipientOption>();
        for (Contact contactRecord : [
            SELECT Id, Name, Email
            FROM Contact
            WHERE AccountId = :accountId AND Email != NULL
            ORDER BY Name
        ]) {
            WeatherController.RecipientOption option = new WeatherController.RecipientOption();
            option.value = contactRecord.Id;
            option.email = contactRecord.Email.trim();
            option.label = contactRecord.Name + ' (' + option.email + ')';
            option.isDefault = false;
            options.add(option);
        }

        return options;
    }

    public static List<WeatherController.RecipientOption> getOrgUsers() {
        List<WeatherController.RecipientOption> options = new List<WeatherController.RecipientOption>();
        if (UserInfo.getUserType() == 'Guest') {
            return options;
        }

        Id currentUserId = UserInfo.getUserId();
        for (User userRecord : [
            SELECT Id, Name, Email
            FROM User
            WHERE IsActive = true AND Email != NULL AND UserType != 'Guest'
            ORDER BY Name
        ]) {
            WeatherController.RecipientOption option = new WeatherController.RecipientOption();
            option.value = userRecord.Id;
            option.email = userRecord.Email.trim();
            option.label = userRecord.Name + ' (' + option.email + ')';
            option.isDefault = userRecord.Id == currentUserId;
            options.add(option);
        }

        return options;
    }

    private static List<String> getContactEmails(Id accountId, List<Id> selectedRecipientIds) {
        Set<String> emails = new Set<String>();
        Set<Id> selectedIds = new Set<Id>(selectedRecipientIds == null ? new List<Id>() : selectedRecipientIds);

        for (Contact contactRecord : [
            SELECT Id, Email
            FROM Contact
            WHERE AccountId = :accountId AND Email != NULL
        ]) {
            if (!selectedIds.isEmpty() && !selectedIds.contains(contactRecord.Id)) {
                continue;
            }
            emails.add(contactRecord.Email.trim());
        }

        return new List<String>(emails);
    }

    private static List<String> getOrgUserEmails(List<Id> selectedRecipientIds) {
        Set<String> emails = new Set<String>();
        Set<Id> selectedIds = new Set<Id>(selectedRecipientIds == null ? new List<Id>() : selectedRecipientIds);

        for (User userRecord : [
            SELECT Id, Email
            FROM User
            WHERE IsActive = true AND Email != NULL AND UserType != 'Guest'
        ]) {
            if (!selectedIds.isEmpty() && !selectedIds.contains(userRecord.Id)) {
                continue;
            }
            emails.add(userRecord.Email.trim());
        }

        return new List<String>(emails);
    }

    private static void sendEmails(List<String> recipients, String subject, String plainTextBody, String htmlBody) {
        List<Messaging.SingleEmailMessage> emails = new List<Messaging.SingleEmailMessage>();

        for (Integer startIndex = 0; startIndex < recipients.size(); startIndex += MAX_RECIPIENTS_PER_EMAIL) {
            List<String> recipientChunk = new List<String>();
            Integer endIndex = Math.min(startIndex + MAX_RECIPIENTS_PER_EMAIL, recipients.size());

            for (Integer index = startIndex; index < endIndex; index++) {
                recipientChunk.add(recipients[index]);
            }

            Messaging.SingleEmailMessage email = new Messaging.SingleEmailMessage();
            email.setSubject(subject);
            email.setPlainTextBody(plainTextBody);
            email.setHtmlBody(htmlBody);
            email.setToAddresses(recipientChunk);
            email.setSaveAsActivity(false);
            emails.add(email);
        }

        for (Messaging.SendEmailResult result : Messaging.sendEmail(emails)) {
            if (!result.isSuccess()) {
                for (Messaging.SendEmailError error : result.getErrors()) {
                    throw new WeatherReportException(error.getMessage());
                }
                throw new WeatherReportException('Weather report email delivery failed.');
            }
        }
    }

    private static void updateSentDate(Id recordId, Datetime sentDate) {
        if (recordId != null) {
            update new Account(Id = recordId, Weather_Report_Sent_Date__c = sentDate);
            return;
        }

        if (UserInfo.getUserType() == 'Guest') {
            return;
        }

        update new User(Id = UserInfo.getUserId(), Weather_Report_Sent_Date__c = sentDate);
    }

    private static String buildSubject(String resolvedLocation) {
        return String.isBlank(resolvedLocation) ? 'Weather Report' : 'Weather Report for ' + resolvedLocation;
    }

    private static String buildHtmlBody(
        String resolvedLocation,
        String condition,
        String temperature,
        String humidity,
        String windSpeed,
        String plainTextBody
    ) {
        String safeLocation = escapeHtml(String.isBlank(resolvedLocation) ? 'Selected Location' : resolvedLocation);
        String safeCondition = escapeHtml(String.isBlank(condition) ? 'Unavailable' : condition);
        String safeTemperature = escapeHtml(String.isBlank(temperature) ? '--' : temperature + ' C');
        String safeHumidity = escapeHtml(String.isBlank(humidity) ? '--' : humidity + '%');
        String safeWindSpeed = escapeHtml(String.isBlank(windSpeed) ? '--' : windSpeed + ' kn');
        String safePlainText = escapeHtml(plainTextBody);

        return
            '<html><body style="margin:0;padding:0;background:#f3f6fb;font-family:Arial,sans-serif;color:#1f2937;">' +
            '<div style="max-width:640px;margin:0 auto;padding:24px;">' +
            '<div style="background:#ffffff;border:1px solid #d8dde6;border-radius:16px;overflow:hidden;">' +
            '<div style="padding:24px;background:linear-gradient(135deg,#dbeafe 0%,#eef2ff 100%);">' +
            '<div style="font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#4b5563;">Texei Weather Report</div>' +
            '<h1 style="margin:8px 0 0;font-size:28px;line-height:1.2;color:#111827;">' + safeLocation + '</h1>' +
            '<p style="margin:8px 0 0;font-size:16px;color:#374151;">Current condition: <strong>' + safeCondition + '</strong></p>' +
            '</div>' +
            '<div style="padding:24px;">' +
            '<table role="presentation" style="width:100%;border-collapse:separate;border-spacing:12px 0;table-layout:fixed;">' +
            '<tr>' +
            buildMetricCell('Temperature', safeTemperature) +
            buildMetricCell('Humidity', safeHumidity) +
            buildMetricCell('Wind Speed', safeWindSpeed) +
            '</tr>' +
            '</table>' +
            '<div style="margin-top:24px;padding:16px;border-radius:12px;background:#f8fafc;color:#4b5563;font-size:14px;line-height:1.6;">' +
            safePlainText +
            '</div>' +
            '</div>' +
            '</div>' +
            '</div>' +
            '</body></html>';
    }

    private static String buildMetricCell(String label, String value) {
        return
            '<td style="padding:0 0 12px;vertical-align:top;">' +
            '<div style="border-radius:12px;background:#ffffff;border:1px solid #e5e7eb;padding:16px;text-align:center;">' +
            '<div style="font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:#6b7280;">' +
            escapeHtml(label) +
            '</div>' +
            '<div style="margin-top:8px;font-size:22px;font-weight:700;color:#111827;">' +
            value +
            '</div>' +
            '</div>' +
            '</td>';
    }

    private static String escapeHtml(String value) {
        String safeValue = value == null ? '' : value;
        safeValue = safeValue.replace('&', '&amp;');
        safeValue = safeValue.replace('<', '&lt;');
        safeValue = safeValue.replace('>', '&gt;');
        safeValue = safeValue.replace('"', '&quot;');
        return safeValue.replace('\'', '&#39;');
    }
}
