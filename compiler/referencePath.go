package compiler

import (
	"errors"
	"strings"

	"github.com/ohler55/ojg/jp"
)

var ErrNotReferencePath = errors.New("the path is not reference path")

type referencePath struct {
	Expr          jp.Expr
	IsContextPath bool
}

// ref: https://states-language.net/#ref-paths
func NewReferencePath(path string) (referencePath, error) {
	result := referencePath{}

	if strings.HasPrefix(path, "$$") {
		path = strings.TrimPrefix(path, "$")
		result.IsContextPath = true
	}

	p, err := jp.ParseString(path)
	if err != nil {
		return referencePath{}, err
	}

	// reference path must not have the operators "@", ",", ":", and "?".
	for _, frag := range p {
		switch frag.(type) {
		case
			jp.At,      // "@"
			jp.Union,   // ","
			jp.Slice,   // ":"
			*jp.Filter: // "?"
			return referencePath{}, ErrNotReferencePath
		}
	}

	result.Expr = p

	return result, nil
}

func (p referencePath) String() string {
	return p.Expr.String()
}
