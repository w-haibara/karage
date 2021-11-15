package statemachine

import (
	"context"

	"github.com/spyzhov/ajson"
)

type PassState struct {
	CommonState
	Result     string `json:"Result"`
	ResultPath string `json:"ResultPath"`
	Parameters string `json:"Parameters"`
}

func (s *PassState) Transition(ctx context.Context, r *ajson.Node) (next string, w *ajson.Node, err error) {
	return s.CommonState.TransitionWithResultpathParameters(ctx, r, nil, s.ResultPath, nil)
}
