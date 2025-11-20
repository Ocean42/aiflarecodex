// @ts-nocheck
export var ReviewDecision;
(function (ReviewDecision) {
    ReviewDecision["YES"] = "yes";
    ReviewDecision["NO_CONTINUE"] = "no-continue";
    ReviewDecision["NO_EXIT"] = "no-exit";
    /**
     * User has approved this command and wants to automatically approve any
     * future identical instances for the remainder of the session.
     */
    ReviewDecision["ALWAYS"] = "always";
    /**
     * User wants an explanation of what the command does before deciding.
     */
    ReviewDecision["EXPLAIN"] = "explain";
})(ReviewDecision || (ReviewDecision = {}));
