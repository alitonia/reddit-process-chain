Select count(*) as count,
  round(avg(length(body)), 2) as average_comment_length,
  round(AVG(length(body)*length(body)) - AVG(length(body))*AVG(length(body)), 2) as standard_deviation,
  max(length(body)) as max_comment_length,
  min(length(body)) as min_comment_length
from comments
{{ group_by }}
