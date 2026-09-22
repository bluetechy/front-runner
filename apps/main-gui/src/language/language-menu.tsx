import IconButton from "@mui/material/IconButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import FlagIcon from "@/shared/icons/FlagIcon";
import { useLanguage } from "./language-preference";
import { languages } from "./languages";

/*
 * The flag in the top bar, and the languages behind it.
 *
 * The button wears the flag of the language in force rather than a globe:
 * a globe says "there are languages", and the flag says which one you are
 * in, which is the question somebody looking at this bar is actually
 * asking.
 */

export function LanguageMenu() {
  const { language, choose } = useLanguage();
  const { t } = useTranslation();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);

  return (
    <>
      <IconButton
        aria-label={t("Language: {{language}}", { language: language.label })}
        aria-haspopup="menu"
        onClick={(event) => setAnchor(event.currentTarget)}
        sx={{
          display: { xs: "none", sm: "inline-flex" },
          color: (theme) => theme.palette.brand.cardInkMuted,
        }}
      >
        <FlagIcon code={language.flag} size={22} />
      </IconButton>

      <Menu
        anchorEl={anchor}
        open={anchor !== null}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        sx={{
          /* Card paper, the same as the account menu beside it. */
          "& .MuiPaper-root": {
            marginTop: "0.4rem",
            minWidth: 200,
            backgroundColor: (theme) => theme.palette.brand.card,
            backgroundImage: "none",
            border: (theme) => `1px solid ${theme.palette.brand.cardRule}`,
            color: (theme) => theme.palette.brand.cardInk,
          },
        }}
      >
        {languages.map((offered) => (
          <MenuItem
            key={offered.tag}
            selected={offered.tag === language.tag}
            onClick={() => {
              choose(offered.tag);
              setAnchor(null);
            }}
            sx={{ gap: 1.25, fontSize: "0.9rem" }}
          >
            <ListItemIcon sx={{ minWidth: "auto" }}>
              <FlagIcon code={offered.flag} size={22} />
            </ListItemIcon>
            {/* Not translated: a language names itself, so "Español
             * (México)" is what it is called in every interface. */}
            {offered.label}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
