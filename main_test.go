package main

import (
	"encoding/json"
	"fmt"
	"io"
	"os"
	"os/exec"
	"reflect"
	"strings"
	"testing"
)

func Test(t *testing.T) {
	tests := []struct {
		name, asl, inputFile, wantFile string
	}{
		{"pass", "pass", "_workflow/inputs/input1.json", "_workflow/outputs/output1.json"},
		{"wait", "wait", "_workflow/inputs/input1.json", "_workflow/outputs/output1.json"},
		{"succeed", "succeed", "_workflow/inputs/input1.json", "_workflow/outputs/output1.json"},
		{"fail", "fail", "_workflow/inputs/input1.json", "_workflow/outputs/output1.json"},
		{"choice", "choice", "_workflow/inputs/input2.json", "_workflow/outputs/output2.json"},
		{"parallel", "parallel", "_workflow/inputs/input2.json", "_workflow/outputs/output3.json"},
		{"task", "task", "_workflow/inputs/input1.json", "_workflow/outputs/output4.json"},
	}
	_, _ = runString(t, "make build-workflow-gen")
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, _ = runString(t, fmt.Sprintf("make workflow-gen asl=%s", tt.asl))
			args := []string{
				"./kuirejo", "start-execution",
				"--asl", "workflow.json",
				"--input", tt.inputFile,
			}
			out, _ := run(t, args[0], args[1:])
			want, err := os.ReadFile(tt.wantFile)
			if err != nil {
				t.Fatal("os.ReadFile(tt.wantFile) failed", err)
			}
			if !jsonEqual(t, []byte(out), want) {
				t.Fatalf("FATAL\nWANT: [%s]\nGOT : [%s]\n", want, out)
			}
		})
	}
}

func runString(t *testing.T, str string) (out1, out2 string) {
	s := strings.Split(str, " ")
	return run(t, s[0], s[1:])
}

func run(t *testing.T, name string, args []string) (out1, out2 string) {
	cmd := exec.Command(name, args...) // #nosec G204
	stdout, err := cmd.StdoutPipe()
	if err != nil {
		t.Fatal("cmd.StdoutPipe() failed", err)
	}
	stderr, err := cmd.StderrPipe()
	if err != nil {
		t.Fatal("cmd.StderrPipe() failed", err)
	}
	if err := cmd.Start(); err != nil {
		t.Fatal("cmd.Start() failed", err)
	}
	o1, err := io.ReadAll(stdout)
	if err != nil {
		t.Fatal("io.ReadAll(stdout) failed", err)
	}
	o2, err := io.ReadAll(stderr)
	if err != nil {
		t.Fatal("io.ReadAll(stderr) failed", err)
	}
	err = cmd.Wait()
	t.Logf("cmd: [%s %v]\n====== stdout ======\n%s\n====== stderr ======\n%s\n",
		name, args, o1, o2)
	if err != nil {
		t.Fatalf("run(t, %s, %v) failed: %v", name, args, err)
	}
	return string(o1), string(o2)
}

func jsonEqual(t *testing.T, b1, b2 []byte) bool {
	var v1, v2 interface{}
	if err := json.Unmarshal(b1, &v1); err != nil {
		t.Fatal("json.Unmarshal(b1, &v1) failed:", err)
	}
	if err := json.Unmarshal(b2, &v2); err != nil {
		t.Fatal("json.Unmarshal(b2, &v2) failed:", err)
	}
	return reflect.DeepEqual(v1, v2)
}
