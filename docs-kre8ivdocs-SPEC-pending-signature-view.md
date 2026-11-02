# Spec: show signatures on pending documents (legacy viewer)

Bug: Jouie signed the A.R.I.S.E. doc. The doc page showed his name, date and initials but an empty signature box.
Cause: the template (and docs from it) are internalVersion 1. The v1 viewer builds fields with `signature: null`,
and the signatures query only runs for version 2. So signature images never draw until the doc is completed and sealed.
Data was fine: signature stored, field inserted, jobs and sealing healthy.

Fix (documents.$id page only):
- Run envelope.field.getSignatures for PENDING docs of any version.
- In the v1 branch, attach each field's signature (image or typed) before rendering.
No DB or schema change. Completed docs unchanged (they show the sealed PDF).

Verify: demo account, v1 doc from a v1 template copy, one fake signer signs, page shows the signature.
