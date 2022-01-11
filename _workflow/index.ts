import { Stack, Duration, aws_stepfunctions as sfn } from "aws-cdk-lib";
import { ScriptTask } from "./script-task.js";

function pass(stack: Stack): sfn.IChainable {
  return new sfn.Pass(stack, "Pass State");
}
function pass_chain(stack: Stack): sfn.IChainable {
  const p1 = new sfn.Pass(stack, "P1");
  const p2 = new sfn.Pass(stack, "P2");
  const p3 = new sfn.Pass(stack, "P3");
  const p4 = new sfn.Pass(stack, "P4");
  const p5 = new sfn.Pass(stack, "P5");
  return p1.next(p2).next(p3).next(p4).next(p5);
}
function pass_result(stack: Stack): sfn.IChainable {
  return new sfn.Pass(stack, "Pass State(result)", {
    result: sfn.Result.fromObject({
      result: {
        aaa: 111,
        bbb: 222,
      },
    }),
    resultPath: "$.resultpath",
  });
}
function wait(stack: Stack): sfn.IChainable {
  return new sfn.Wait(stack, "Wait State", {
    time: sfn.WaitTime.duration(Duration.seconds(1)),
  });
}
function succeed(stack: Stack): sfn.IChainable {
  return new sfn.Succeed(stack, "Succeed State");
}
function fail(stack: Stack): sfn.IChainable {
  return new sfn.Fail(stack, "Fail State");
}
function choice(stack: Stack): sfn.IChainable {
  return new sfn.Choice(stack, "Choice State")
    .when(sfn.Condition.booleanEquals("$.bool", true), succeed(stack))
    .otherwise(fail(stack));
}
function choice_fallback(stack: Stack): sfn.IChainable {
  const s1 = new sfn.Pass(stack, "State1", {
    result: sfn.Result.fromObject({
      bool: false,
    }),
  });
  const s2 = new sfn.Pass(stack, "State2");
  const s3 = new sfn.Pass(stack, "State3");
  const pass = s1.next(s2);
  const choice = new sfn.Choice(stack, "Choice State")
    .when(sfn.Condition.booleanEquals("$.bool", false), s3)
    .otherwise(pass);
  return s2.next(choice);
}
function task(stack: Stack): sfn.IChainable {
  return new ScriptTask(stack, "Task State", {
    scriptPath: "_workflow/script/script1.sh",
  });
}
function task_filter(stack: Stack): sfn.IChainable {
  return new ScriptTask(stack, "Task State", {
    scriptPath: "_workflow/script/script1.sh",
    inputPath: "$.inputpath",
    parameters: sfn.TaskInput.fromObject({
      aaa: 111,
      "old.$": "$.args",
      args: ["param0", "param1", "param2"],
    }),
    resultSelector: {
      bbb: 222,
      "resultselector.$": "$",
    },
    resultPath: "$.resultpath.outputpath",
    outputPath: "$.resultpath",
  });
}
function task_retry(stack: Stack): sfn.IChainable {
  const task = new ScriptTask(stack, "Task State", {
    scriptPath: "_workflow/script/script2.sh",
    resultPath: "$.args",
  });
  const chain = new sfn.Parallel(stack, "Chain").branch(task);
  chain.addRetry({
    maxAttempts: 10,
    backoffRate: 0,
    interval: Duration.seconds(0),
  });
  return chain;
}
function task_catch(stack: Stack): sfn.IChainable {
  const p1 = new sfn.Pass(stack, "Pass State1");
  const task = new ScriptTask(stack, "Task State", {
    scriptPath: "::", // invalid resource path
  });
  task.addCatch(p1, {
    errors: ["States.ALL"],
  });
  return task;
}
function task_ctx(stack: Stack): sfn.IChainable {
  return new ScriptTask(stack, "Task State", {
    scriptPath: "_workflow/script/script1.sh",
    resultSelector: {
      ctx: {
        "ctx_aaa.$": "$$.aaa",
      },
    },
  });
}
function parallel(stack: Stack): sfn.IChainable {
  return new sfn.Parallel(stack, "Parallel State")
    .branch(pass(stack))
    .branch(succeed(stack));
}
/*
function map(stack: Stack): sfn.IChainable {
  return new sfn.Pass(stack, "Pass State");
}
*/

const workflows = {
  pass: pass,
  pass_chain: pass_chain,
  pass_result: pass_result,
  wait: wait,
  succeed: succeed,
  fail: fail,
  choice: choice,
  choice_fallback: choice_fallback,
  task: task,
  task_filter: task_filter,
  task_retry: task_retry,
  task_catch: task_catch,
  task_ctx: task_ctx,
  parallel: parallel,
};

function list() {
  console.log(Object.keys(workflows).join("\n"));
}

function render(sm: sfn.IChainable) {
  return new Stack().resolve(
    new sfn.StateGraph(sm.startState, "Graph").toGraphJson()
  );
}

function print(sm: sfn.IChainable) {
  console.log(JSON.stringify(render(sm), null, "  "));
}

const args = process.argv.slice(2);
if (args.length == 0) {
  console.error("not enough args");
  process.exit(1);
}

if (args[0] == "list") {
  list();
  process.exit(0);
}

const stack = new Stack();
for (const [key, wf] of Object.entries(workflows)) {
  if (key == args[0]) {
    print(wf(stack));
    process.exit(0);
  }
}

console.error("unknown key:", args[0]);
