Select count(*) as count,
  round(avg(length(body)), 2) as average_comment_length,
  max(length(body)) as max_comment_length,
  min(length(body)) as min_comment_length
from comments
    {{ filter }}
    {{ group_by }}
