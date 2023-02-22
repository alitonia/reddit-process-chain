Select id, sum(count) as total  from comment_entity  {{ filter }} group by id order by total desc limit 100
