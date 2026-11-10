// The judge's prompt and how its verdict is read, shared by judge.mjs and the promptfoo assertion
// so both score a reply the same way. Nothing here may name the arm.

export function judgePrompt(user, key, reply, earlier) {
	const history = earlier
		? `<first_user_message>\n${earlier.user}\n</first_user_message>\n<first_reply>\n${earlier.reply}\n</first_reply>\n`
		: ''
	return `Score one assistant reply against one criterion. Judge only the criterion, not the quality of the reply.

${history}<user_message>
${user}
</user_message>
<reply>
${reply}
</reply>

Criterion: ${key}

Answer with exactly one line: PASS or FAIL, then " - ", then a reason of at most 25 words.`
}

// A judge sometimes reverses itself on a later line; its last verdict line is its answer.
export function readVerdict(verdict) {
	return (
		verdict
			.match(/^(?:\w+:\s*)?(PASS|FAIL)\b/gm)
			?.at(-1)
			?.endsWith('PASS') ?? false
	)
}
