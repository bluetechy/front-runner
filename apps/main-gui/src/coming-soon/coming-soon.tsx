import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";

/* Stands in for the pages the header links to but that do not exist yet. */
export function ComingSoon({ title }: { title: string }) {
  return (
    <Container
      component="section"
      sx={{
        display: "flex",
        flex: 1,
        flexDirection: "column",
        justifyContent: "center",
        paddingBlock: "clamp(4rem, 12vw, 9rem)",
      }}
    >
      <Typography variant="h2">{title}</Typography>
      <Typography
        variant="body1"
        sx={{ maxWidth: "44ch", mt: 2, color: "text.secondary" }}
      >
        This page has not been built yet. The landing page is the only one with
        real content so far.
      </Typography>
    </Container>
  );
}
