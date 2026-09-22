import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";

/* Stands in for the pages the header and the rail link to but that do not
 * exist yet. It is rendered inside whichever shell the route sits in, so it
 * says nothing about the chrome around it. */
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
        This page has not been built yet. The link is here so the shape of the
        product is visible before all of it is.
      </Typography>
    </Container>
  );
}
