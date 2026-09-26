import { BadRequestException, Injectable } from "@nestjs/common";
import { DatabaseService } from "../database/index.js";
import { parseAndValidate } from "./widgets.validation.js";
import { SavedWidget, WidgetSummary } from "./widgets.model.js";

// One widget as it is stored: the definition, and which version this is.
export interface StoredWidget {
  WidgetId: string;
  Version: number;
  Definition: unknown;
  UpdatedAt: Date;
}

@Injectable()
export class WidgetsService {
  constructor(private readonly db: DatabaseService) {}

  /*
   * Save a definition as the next version of a widget.
   *
   * The definition arrives as text rather than as a parsed object, which is on
   * purpose at both ends. A GraphQL variable holding a widget document would
   * have to be a scalar the schema cannot describe -- the document's shape is
   * the widget schema's business, not the API schema's -- and text is also
   * exactly what the author has in their hand: it is what they pasted, and a
   * JSON syntax error in it is a sentence about the character it broke at
   * rather than "expected object, received string".
   *
   * **Nothing is stored that has not been validated.** That is the one
   * invariant this vertical exists to keep, and it is why the guardrails run
   * here rather than in the resolver: the controller, the resolver and any
   * future caller all go through this method, so there is no path to the
   * database that skips them.
   */
  async save(
    loginName: string,
    widgetId: string | null,
    name: string,
    definition: string,
  ): Promise<SavedWidget> {
    const checked = parseAndValidate<object>(definition);
    /*
     * Every failing field in one message, joined the way `ZodPipe` joins the
     * profile form's: a form that has to be submitted once per mistake is a
     * form nobody finishes, and a widget document has a great many more places
     * to be wrong than a profile does.
     *
     * The separator is part of the contract rather than a formatting choice.
     * main-gui's studio splits on it to list the problems under the field, and
     * `docs/widgets.md` says so at both ends.
     */
    if (!checked.ok) throw new BadRequestException(checked.errors.join("; "));

    const [saved] = await this.db.query<SavedWidget>(
      'SELECT * FROM dbo."SaveWidget"($1, $2, $3, $4)',
      [loginName, widgetId, name, JSON.stringify(checked.definition)],
    );
    /* The function either answers the row or raises, and the database service
     * turns a raise into the right HTTP status, so there is no third case here
     * -- but the array access has to be narrowed regardless. */
    if (!saved) throw new BadRequestException("The widget could not be saved");
    return saved;
  }

  /* The caller's own widgets, most recently saved first. Not paged: an account
   * with enough widgets for paging to matter is an account this page will have
   * been rewritten for. */
  list(loginName: string) {
    return this.db.query<WidgetSummary>('SELECT * FROM dbo."GetWidgets"($1)', [
      loginName,
    ]);
  }

  /*
   * The definition a browser is served, by public id.
   *
   * No login name, because there is nobody to name: this is the one read in
   * the product that answers a page anybody can open. `dbo.GetWidget` is the
   * same shape for the same reason, and the origin check that decides whether
   * a particular page may render it is in the controller above this.
   */
  async read(widgetId: string): Promise<StoredWidget | null> {
    const [found] = await this.db.query<StoredWidget>(
      'SELECT * FROM dbo."GetWidget"($1)',
      [widgetId],
    );
    /* Null for an id that does not exist and for a widget with no version yet,
     * which the controller turns into one answer: telling a stranger which ids
     * are real would undo the only thing protecting a definition. */
    return found ?? null;
  }
}
