import { BadRequestException, Injectable } from "@nestjs/common";
import { DatabaseService } from "../database/index.js";
import { parseAndValidate } from "./widgets.validation.js";
import {
  SavedWidget,
  WidgetDocument,
  WidgetSummary,
  WidgetVersion,
} from "./widgets.model.js";

// One widget as it is stored: the published definition, and which version it is.
export interface StoredWidget {
  WidgetId: string;
  Version: number;
  Definition: unknown;
  UpdatedAt: Date;
}

/* What the database hands back for a definition. `Definition` is a parsed
 * object, because the pg driver parses jsonb; the GraphQL field is a string, and
 * this is where that conversion happens. */
interface StoredDefinition extends Omit<WidgetDocument, "Definition"> {
  Definition: unknown;
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
   *
   * **Saving is not publishing.** The new version becomes the draft and what
   * browsers are served does not move. `publish` is the other half.
   *
   * `expectedDraftVersion` is what the studio read the document at. The
   * database refuses the save if the draft has moved since, rather than writing
   * over work nobody has seen.
   */
  async save(
    loginName: string,
    widgetId: string | null,
    name: string,
    definition: string,
    expectedDraftVersion: number | null = null,
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
      'SELECT * FROM dbo."SaveWidget"($1, $2, $3, $4, $5)',
      [
        loginName,
        widgetId,
        name,
        JSON.stringify(checked.definition),
        expectedDraftVersion,
      ],
    );
    /* The function either answers the row or raises, and the database service
     * turns a raise into the right HTTP status, so there is no third case here
     * -- but the array access has to be narrowed regardless. */
    if (!saved) throw new BadRequestException("The widget could not be saved");
    return saved;
  }

  /*
   * Put one of a widget's versions in front of browsers.
   *
   * This is also the whole of rollback: every version is still stored, so "go
   * back to 3" and "ship 5" are the same call with a different number. The
   * version is named rather than assumed, because somebody rolling back at
   * speed is publishing the version they just read, not whatever the draft
   * happens to be by the time the request lands.
   */
  async publish(
    loginName: string,
    widgetId: string,
    version: number,
  ): Promise<SavedWidget> {
    const [published] = await this.db.query<SavedWidget>(
      'SELECT * FROM dbo."PublishWidget"($1, $2, $3)',
      [loginName, widgetId, version],
    );
    if (!published)
      throw new BadRequestException("The widget could not be published");
    return published;
  }

  /* Take it off the sites it is on, deleting nothing: the id, the draft and
   * every version stay, and `GET /widgets/:id` starts answering the same "no
   * such widget" it answers for an id that was never minted. */
  async unpublish(loginName: string, widgetId: string): Promise<SavedWidget> {
    const [unpublished] = await this.db.query<SavedWidget>(
      'SELECT * FROM dbo."UnpublishWidget"($1, $2)',
      [loginName, widgetId],
    );
    if (!unpublished)
      throw new BadRequestException("The widget could not be unpublished");
    return unpublished;
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
   * One of the author's own definitions, read back.
   *
   * Not `read` with a login name on it: the two answer different questions.
   * This one is about a person's own widget and will hand back a draft that has
   * never been published, which is exactly what `read` must never do.
   *
   * `version` null means the draft, because that is what opening a widget to
   * work on it means.
   */
  async definition(
    loginName: string,
    widgetId: string,
    version: number | null = null,
  ): Promise<WidgetDocument | null> {
    const [found] = await this.db.query<StoredDefinition>(
      'SELECT * FROM dbo."GetWidgetDefinition"($1, $2, $3)',
      [loginName, widgetId, version],
    );
    if (!found) return null;
    /* Back to text on the way out, the way it arrived. The studio is going to
     * put it in a text area, and a `String` field is also what keeps the widget
     * language out of this API's schema. */
    return { ...found, Definition: JSON.stringify(found.Definition) };
  }

  /* A widget's history: what there is to go back to, and which one is live. */
  versions(loginName: string, widgetId: string) {
    return this.db.query<WidgetVersion>(
      'SELECT * FROM dbo."GetWidgetVersions"($1, $2)',
      [loginName, widgetId],
    );
  }

  /*
   * The definition a browser is served, by public id.
   *
   * No login name, because there is nobody to name: this is the one read in
   * the product that answers a page anybody can open. `dbo.GetWidget` is the
   * same shape for the same reason, and the origin check that decides whether
   * a particular page may render it is in the controller above this.
   *
   * It answers the **published** version. A widget being worked on serves what
   * it was last published at, and one that has never been published answers
   * nothing at all.
   */
  async read(widgetId: string): Promise<StoredWidget | null> {
    const [found] = await this.db.query<StoredWidget>(
      'SELECT * FROM dbo."GetWidget"($1)',
      [widgetId],
    );
    /* Null for an id that does not exist, for a widget with no version yet, and
     * for one that is not published, which the controller turns into one
     * answer: telling a stranger which ids are real would undo the only thing
     * protecting a definition. */
    return found ?? null;
  }
}
