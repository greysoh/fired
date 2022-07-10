export async function ask(title: string, args: any): Promise<number> {
  console.log(title + "\n");
  for (const i in args) {
    console.log(`${parseInt(i) + 1}: ${args[i].title}`);
  }

  while (true) {
    const answerStr: any = await prompt(">");
    const answer: number = parseInt(answerStr);

    if (Number.isNaN(answer)) {
      // Type checking without throwing an error
      console.log("Please enter a number.");
    } else if (answer <= 0 || answer > args.length) {
      console.log("Please enter a number between 1 and " + args.length + ".");
    } else {
      return args[answer - 1].returnId;
    }
  }
}
