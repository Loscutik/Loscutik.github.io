package main

import (
	"flag"
	"fmt"
	"html/template"
	"log"
	"net/http"
	"path/filepath"
	"strconv"
)

func main() {
	// Handlers to run the web pages
	mux := http.NewServeMux()
	mux.HandleFunc("/", homePageHandler)
	fileServer := http.FileServer(neuteredFileSystem{http.Dir("./web/static/")})
	mux.Handle("/static/",  http.StripPrefix("/static" ,fileServer))
	// Starting the web server
	port, err := parseArgs()
	if err != nil {
		log.Fatal(err)
	}
	log.Printf("Starting server at http://localhost:%s\n", *port)
	if err := http.ListenAndServe(":"+*port, mux); err != nil {
		log.Fatal(err)
	}
}

// this type doesn't allow FileServer to open directions in the static direction
type neuteredFileSystem struct {
	fs http.FileSystem
}

func (nfs neuteredFileSystem) Open(path string) (http.File, error) {
	f, err := nfs.fs.Open(path)
	if err != nil {
		return nil, err
	}
	s, err := f.Stat()
	if err != nil {
		return nil, err
	}
	if s.IsDir() {
		if _, err := nfs.fs.Open(filepath.Join(path, "index.html")); err != nil {
			closeErr := f.Close()
			if closeErr != nil {
				return nil, closeErr
			}
			return nil, err
		}
	}

	return f, nil
}

// The handler of the main page
func homePageHandler(w http.ResponseWriter, r *http.Request) {
	if r.URL.Path != "/" {
		http.NotFound(w, r)
		return
	}

	tm, err := template.ParseFiles("web/index.html")
	if err != nil {
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		log.Fatalln(err)
		return
	}
	err = tm.Execute(w, nil)
	if err != nil {
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		log.Fatalln(err)
		return
	}
}

// Parses the program's arguments to obtain the server port. If no arguments found, it uses the 8080 port by default
// Usage: go run .  --port=PORT_NUMBER
func parseArgs() (*string, error) {
	port := flag.String("port", "8080", "server port")
	flag.Parse()
	if flag.NArg() > 0 {
		return nil, fmt.Errorf("wrong arguments\nUsage: go run .  --port=PORT_NUMBER")
	}
	_, err := strconv.ParseUint(*port, 10, 16)
	if err != nil {
		return nil, fmt.Errorf("error: port must be a 16-bit unsigned number ")
	}
	return port, nil
}
