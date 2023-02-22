Select length(body) as c_length, count (length(body)) as total from comments {{ filter }} group by length(body)
