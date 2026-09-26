<#--
  The box that asks for the texted code, in the browser login.

  It extends Keycloak's own template rather than styling itself, so it inherits
  whatever theme the realm is wearing and does not become a page that has to be
  restyled every time the login page is. What it adds is three things and no
  more: the masked number, the box, and a way to ask for another message.

  The number is masked here as well as in the Java that supplies it. Belt and
  braces on the one page in the product that is seen before anybody has proved
  who they are: the reader might be the attacker.
-->
<#import "template.ftl" as layout>
<@layout.registrationLayout displayMessage=!messagesPerField.existsError('sms_code'); section>
    <#if section = "header">
        Enter the code we texted you
    <#elseif section = "form">
        <form id="kc-sms-code-form" class="${properties.kcFormClass!}" action="${url.loginAction}" method="post">
            <div class="${properties.kcFormGroupClass!}">
                <p class="${properties.kcLabelClass!}">
                    We sent a code to ${phoneNumber}. It expires in ${codeLifetimeMinutes} minutes.
                </p>
            </div>

            <div class="${properties.kcFormGroupClass!}">
                <label for="sms_code" class="${properties.kcLabelClass!}">Code</label>
                <input id="sms_code" name="sms_code" type="text"
                       class="${properties.kcInputClass!}"
                       autocomplete="one-time-code"
                       inputmode="numeric"
                       pattern="[0-9]*"
                       maxlength="6"
                       autofocus
                       aria-invalid="<#if messagesPerField.existsError('sms_code')>true</#if>" />
            </div>

            <div class="${properties.kcFormGroupClass!}">
                <input class="${properties.kcButtonClass!} ${properties.kcButtonPrimaryClass!} ${properties.kcButtonBlockClass!} ${properties.kcButtonLargeClass!}"
                       name="login" id="kc-login" type="submit" value="Continue" />
            </div>

            <#-- Its own button rather than a link, because it posts: a fresh
                 code has to retire the one before it, and only the server can
                 do that. -->
            <div class="${properties.kcFormGroupClass!}">
                <button class="${properties.kcButtonClass!} ${properties.kcButtonDefaultClass!} ${properties.kcButtonBlockClass!}"
                        name="resend" id="kc-sms-resend" type="submit" value="1">
                    Send another code
                </button>
            </div>
        </form>
    </#if>
</@layout.registrationLayout>
