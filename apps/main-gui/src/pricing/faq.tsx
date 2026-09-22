import Accordion from "@mui/material/Accordion";
import AccordionDetails from "@mui/material/AccordionDetails";
import AccordionSummary from "@mui/material/AccordionSummary";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import ChevronDownIcon from "@/shared/icons/ChevronDownIcon";

/*
 * The questions somebody asks between reading the prices and signing up,
 * borrowed in shape from the bottom of Gamma's pricing page: one column of
 * panels, all closed to begin with, so the page ends short rather than in a
 * wall of prose.
 *
 * These are violet panels rather than white cards on purpose. The white is
 * what makes the prices the loudest thing above; repeating it down here would
 * flatten the page into one long sheet.
 *
 * The answers are copy, not policy. Nothing bills yet -- see
 * docs/pricing-page.md -- so each one has to be checked against the real
 * terms before this page goes anywhere near a paying customer.
 */

const questions = [
  {
    question: "Do I need a credit card to start?",
    answer:
      "No. Free is free for as long as you want it, and it does not ask for a card or start a trial clock. You give us a card when you move to a paid plan, and not before.",
  },
  {
    question: "What counts as a member?",
    answer:
      "Anyone who has accepted an invitation into your organization and can sign in — the people earning points and badges, and the people running the programme. Invitations you have sent but nobody has accepted do not count, and removing someone frees their place immediately.",
  },
  {
    question: "Should I be on an Individual plan or a Business one?",
    answer:
      "Individual plans assume one person sets the rules and everybody else plays. The moment a second person needs to award points, approve a redemption or manage members, you want Team: it bills per member, carries named roles and per-object permissions, and keeps an audit trail of who changed what.",
  },
  {
    question: "Can I change plans later?",
    answer:
      "Any time, in both directions. Upgrading takes effect at once and we charge the difference for the rest of the period. Downgrading takes effect at the end of the period you have already paid for, so you keep what you bought until it runs out.",
  },
  {
    question: "How does paying yearly work?",
    answer:
      "A year costs 20% less than twelve months bought one at a time, charged once up front. You can switch a monthly plan to yearly whenever you like and the credit you have left is carried over; switching back happens at your renewal date.",
  },
  {
    question: "What payment methods do you take, and is tax included?",
    answer:
      "Every major credit and debit card, on all plans. Team and Enterprise can pay by invoice and bank transfer instead. Prices are shown before tax; VAT, GST or sales tax is worked out from your billing address and shown on the receipt.",
  },
  {
    question: "What happens to our points and badges if we cancel?",
    answer:
      "Nothing is deleted when a plan ends. The organization drops to Free, so anything above its limits becomes read-only rather than lost, and you can export your points, badges and event log at any time. Ask us to delete an account and we do, permanently, within 30 days.",
  },
  {
    question: "Do you give refunds?",
    answer:
      "If a paid plan is not what you expected, write to us inside 30 days of the charge and we refund it in full — the first month of a monthly plan, or the first year of a yearly one. After that we refund the unused part of a yearly plan on request.",
  },
  {
    question: "Who can see our organization's data?",
    answer:
      "Only the members of it. Every point, badge and task is scoped to the organization that owns it, and membership only ever happens by invitation and acceptance — nobody is added to your organization without agreeing to it. Enterprise adds single sign-on against your own identity provider, so access follows your directory.",
  },
  {
    question: "What support comes with each plan?",
    answer:
      "Free and Plus get email support and the documentation. Pro gets priority support, which means your message goes to the front of the queue. Team adds onboarding help and a reply inside one business day, and Enterprise adds a named account manager and an agreed response time in writing.",
  },
] as const;

export function Faq() {
  return (
    <Box sx={{ maxWidth: "52rem", mx: "auto", width: "100%" }}>
      {questions.map(({ question, answer }) => (
        <Accordion
          key={question}
          disableGutters
          elevation={0}
          sx={{
            mb: 1.25,
            borderRadius: "1rem",
            backgroundColor: (theme) => theme.palette.brand.panel,
            backgroundImage: "none",
            border: (theme) => `1px solid ${theme.palette.brand.panelEdge}`,
            /* Material draws a divider above every panel but the first, and
             * squares off the corners of a group; neither belongs on panels
             * that are meant to read as separate cards. */
            "&::before": { display: "none" },
            "&:last-of-type": { mb: 0 },
          }}
        >
          <AccordionSummary
            expandIcon={<ChevronDownIcon size={22} />}
            sx={{
              padding: "0.35rem 1.4rem",
              "& .MuiAccordionSummary-content": { marginBlock: "0.9rem" },
              "& .MuiAccordionSummary-expandIconWrapper": {
                color: "primary.light",
              },
            }}
          >
            <Typography sx={{ fontSize: "1rem", fontWeight: 600 }}>
              {question}
            </Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ padding: "0 1.4rem 1.4rem" }}>
            <Typography
              variant="body1"
              sx={{
                fontSize: "0.9rem",
                lineHeight: 1.8,
                color: "text.secondary",
              }}
            >
              {answer}
            </Typography>
          </AccordionDetails>
        </Accordion>
      ))}
    </Box>
  );
}
