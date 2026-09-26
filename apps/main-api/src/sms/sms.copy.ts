// What a text message from this product says.
//
// Both messages are here rather than beside the code that sends them, because
// they are the same message to the person holding the phone and they are sent
// from two different places: one when a number is being attached to an
// account, one when a login is waiting on it. Somebody who reads both within a
// minute of each other should be able to tell which is which, and that is
// easier to get right when they are written next to each other than when they
// are a folder apart.
//
// Three rules they both keep, and each one is a rule because messages that
// break it get people robbed:
//
//   * The product's name comes first, so a code that arrives while somebody is
//     not expecting one is identifiably about this account.
//   * The code is the only number in the sentence, because a message with two
//     numbers in it is one somebody reads the wrong half of.
//   * Nothing is a link and nothing asks for anything back. A text message
//     that tells people to follow links or reply with codes is training for
//     the next message, which will not be from us.

// The enrollment code: proving a number belongs to the person setting it up.
export function enrollmentCode(product: string, code: string): string {
  return `${product}: ${code} is your code to confirm this phone number. It expires in ten minutes. We will never ask you for it.`;
}

// The login code, sent by Keycloak's authenticator through this API.
//
// It says what is waiting on the code, because this is the message that
// arrives when somebody else is typing a password: a person who reads "your
// login code" while sitting on the sofa has just been told their password is
// known to somebody, and the sentence has to be clear enough for that to land.
export function loginCode(product: string, code: string): string {
  return `${product}: ${code} is your login code. It expires in five minutes. If you are not logging in right now, change your password.`;
}
